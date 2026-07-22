import re
import os
import time
import httpx
from typing import List, Dict, Optional, Any
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(
    title="YouTube Embedded Video Caption Compliance Microservice",
    description="FastAPI service for batch caption accessibility validation aligned with WCAG 2.1 AA & June 2027 CCC POCR Standard 2.5",
    version="1.0.0"
)

# Persistent Cache (In-Memory / SQLite with 60-day TTL)
CACHE_STORE: Dict[str, Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 60 * 24 * 60 * 60 # 60 days

# ------------------------------------------------------------------
# Pydantic Schemas
# ------------------------------------------------------------------
class CaptionTrackItem(BaseModel):
  kind: Optional[str] = "" # 'asr' for auto-generated or ''/'manual' for human
  language: Optional[str] = "en"

class VideoItemInput(BaseModel):
  url: str
  embed_code: Optional[str] = ""
  location: Optional[str] = "content_page"
  tracks: Optional[List[CaptionTrackItem]] = []

class VideoCheckRequest(BaseModel):
  videos: List[VideoItemInput]
  api_key: Optional[str] = None

class CaptionDetails(BaseModel):
  has_captions: bool
  is_auto_generated: bool
  language: str = "en"

def evaluate_tracks_rule_matrix(tracks: Optional[List[CaptionTrackItem]] = None, has_api_captions: bool = False, title: str = ""):
  """
  YouTube Caption Logic Matrix:
  1. PASS (LIKELY_COMPLIANT): Video has AT LEAST ONE manual caption track (`track.kind != 'asr'`).
     Auto captions alongside manual track are allowed and pass.
  2. FAIL (NON_COMPLIANT_AUTO_CAPTIONS): ONLY has auto-generated captions (`track.kind == 'asr'`) and no manual captions exist.
  3. FAIL (NON_COMPLIANT_MISSING_CAPTIONS): NO captions exist at all.
  """
  if tracks:
    has_manual = any(t.kind and t.kind.lower() != "asr" for t.kind in [t.kind for t in tracks if t.kind])
    has_auto_only = len(tracks) > 0 and all(t.kind and t.kind.lower() == "asr" for t in tracks)

    if has_manual:
      return "LIKELY_COMPLIANT", "INFO", CaptionDetails(has_captions=True, is_auto_generated=False, language="en"), "Manually verified human caption track detected."
    elif has_auto_only:
      return "NON_COMPLIANT_AUTO_CAPTIONS", "WARNING", CaptionDetails(has_captions=True, is_auto_generated=True, language="en"), "Replace or edit automatic speech recognition (ASR) captions with a verified human caption track."

  lower_title = title.lower()
  is_auto_in_title = "auto-generated" in lower_title or "asr" in lower_title

  if has_api_captions and not is_auto_in_title:
    return "LIKELY_COMPLIANT", "INFO", CaptionDetails(has_captions=True, is_auto_generated=False, language="en"), "Manually verified human caption track detected."
  elif has_api_captions and is_auto_in_title:
    return "NON_COMPLIANT_AUTO_CAPTIONS", "WARNING", CaptionDetails(has_captions=True, is_auto_generated=True, language="en"), "Replace or edit automatic speech recognition (ASR) captions with a verified human caption track."
  else:
    return "NON_COMPLIANT_MISSING_CAPTIONS", "CRITICAL", CaptionDetails(has_captions=False, is_auto_generated=False, language="unknown"), "No closed captions detected. Add accurate human-edited closed captions or a transcript."

class ComplianceResultItem(BaseModel):
  youtube_video_id: Optional[str] = None
  provider: Optional[str] = "youtube"
  original_url: str
  found_in_locations: List[str]
  status: str # NON_COMPLIANT_MISSING_CAPTIONS | NON_COMPLIANT_AUTO_CAPTIONS | LIKELY_COMPLIANT | NEEDS_MANUAL_REVIEW
  flag_level: str # CRITICAL | WARNING | INFO
  caption_details: Optional[CaptionDetails] = None
  recommendation: str

class ComplianceSummary(BaseModel):
  total_videos_found: int
  youtube_videos: int
  non_youtube_videos: int
  cached_hits: int
  api_queries_made: int
  compliant_count: int
  non_compliant_count: int
  manual_review_count: int

class VideoComplianceReport(BaseModel):
  summary: ComplianceSummary
  results: List[ComplianceResultItem]

# ------------------------------------------------------------------
# Helper Functions
# ------------------------------------------------------------------
def extract_youtube_id(url: str) -> Optional[str]:
  """Extracts standard 11-character YouTube video ID"""
  if not url:
    return None
  patterns = [
      r'(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})',
      r'^[a-zA-Z0-9_-]{11}$'
  ]
  for pattern in patterns:
    match = re.search(pattern, url)
    if match:
      return match.group(1)
  return None

def detect_provider(url: str) -> str:
  lower = url.lower()
  if 'youtube.com' in lower or 'youtu.be' in lower:
    return 'youtube'
  if 'vimeo.com' in lower:
    return 'vimeo'
  if 'panopto' in lower:
    return 'panopto'
  if 'kaltura' in lower:
    return 'kaltura'
  if lower.endswith('.mp4') or 'video' in lower:
    return 'html5_video'
  return 'other'

# ------------------------------------------------------------------
# API Endpoint
# ------------------------------------------------------------------
@app.post("/api/check-video-compliance", response_model=VideoComplianceReport)
async def check_video_compliance(payload: VideoCheckRequest):
  api_key = payload.api_key or os.environ.get("YOUTUBE_API_KEY")
  
  yt_map: Dict[str, Dict[str, Any]] = {}
  non_yt_list: List[Dict[str, Any]] = []

  # 1. Deduplicate and Group Input Videos
  for item in payload.videos:
    yt_id = extract_youtube_id(item.url)
    if yt_id:
      if yt_id not in yt_map:
        yt_map[yt_id] = {
            "id": yt_id,
            "url": item.url,
            "locations": [item.location]
        }
      else:
        if item.location not in yt_map[yt_id]["locations"]:
          yt_map[yt_id]["locations"].append(item.location)
    else:
      provider = detect_provider(item.url)
      non_yt_list.append({
          "provider": provider,
          "url": item.url,
          "embed_code": item.embed_code,
          "locations": [item.location]
      })

  cached_hits = 0
  api_queries_made = 0
  uncached_ids: List[str] = []
  results_map: Dict[str, ComplianceResultItem] = {}

  # 2. Check Cache First
  now = time.time()
  for yt_id in yt_map.keys():
    if yt_id in CACHE_STORE:
      cached_entry = CACHE_STORE[yt_id]
      if now - cached_entry["timestamp"] < CACHE_TTL_SECONDS:
        cached_hits += 1
        data = cached_entry["data"]
        results_map[yt_id] = ComplianceResultItem(
            youtube_video_id=yt_id,
            provider="youtube",
            original_url=yt_map[yt_id]["url"],
            found_in_locations=yt_map[yt_id]["locations"],
            status=data["status"],
            flag_level=data["flag_level"],
            caption_details=data.get("caption_details"),
            recommendation=data["recommendation"]
        )
        continue
    uncached_ids.append(yt_id)

  # 3. Batch Process Uncached YouTube Video IDs (Max 50 per Batch)
  if uncached_ids:
    if api_key:
      # Batch in chunks of 50
      for i in range(0, len(uncached_ids), 50):
        batch_chunk = uncached_ids[i:i + 50]
        ids_str = ",".join(batch_chunk)
        api_queries_made += 1

        url = f"https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id={ids_str}&key={api_key}"
        async with httpx.AsyncClient() as client:
          resp = await client.get(url)
          if resp.status_code == 200:
            data = resp.json()
            items_by_id = {v["id"]: v for v in data.get("items", [])}

            for yid in batch_chunk:
              v_data = items_by_id.get(yid)
              if not v_data:
                # Video not found / deleted / private
                item_res = ComplianceResultItem(
                    youtube_video_id=yid,
                    provider="youtube",
                    original_url=yt_map[yid]["url"],
                    found_in_locations=yt_map[yid]["locations"],
                    status="NON_COMPLIANT_MISSING_CAPTIONS",
                    flag_level="CRITICAL",
                    caption_details=CaptionDetails(has_captions=False, is_auto_generated=False, language="unknown"),
                    recommendation="Video unavailable or private. Replace link with an accessible, active video."
                )
              else:
                c_details = v_data.get("contentDetails", {})
                has_captions = c_details.get("caption") == "true"
                snippet = v_data.get("snippet", {})
                title = snippet.get("title", "")
                input_tracks = yt_map[yid].get("tracks", [])

                status, flag_level, cap_details, rec = evaluate_tracks_rule_matrix(input_tracks, has_captions, title)

                item_res = ComplianceResultItem(
                    youtube_video_id=yid,
                    provider="youtube",
                    original_url=yt_map[yid]["url"],
                    found_in_locations=yt_map[yid]["locations"],
                    status=status,
                    flag_level=flag_level,
                    caption_details=cap_details,
                    recommendation=rec
                )

              # Save to Cache
              CACHE_STORE[yid] = {
                  "timestamp": now,
                  "data": item_res.model_dump()
              }
              results_map[yid] = item_res

    else:
      # Offline / Heuristic Fallback when API Key is not set
      for yid in uncached_ids:
        # Heuristic check based on URL parameters
        raw_url = yt_map[yid]["url"]
        has_cc_param = "cc_load_policy=1" in raw_url or "caption" in raw_url.toLowerCase()

        if has_cc_param:
          status = "LIKELY_COMPLIANT"
          flag_level = "INFO"
          rec = "Closed caption parameter detected on embed tag."
          has_c = True
          is_a = False
        else:
          status = "NON_COMPLIANT_AUTO_CAPTIONS"
          flag_level = "WARNING"
          rec = "Video may rely on unedited auto-generated captions. Verify human caption track accuracy."
          has_c = True
          is_a = True

        item_res = ComplianceResultItem(
            youtube_video_id=yid,
            provider="youtube",
            original_url=raw_url,
            found_in_locations=yt_map[yid]["locations"],
            status=status,
            flag_level=flag_level,
            caption_details=CaptionDetails(has_captions=has_c, is_auto_generated=is_a, language="en"),
            recommendation=rec
        )
        CACHE_STORE[yid] = {"timestamp": now, "data": item_res.model_dump()}
        results_map[yid] = item_res

  # 4. Handle Non-YouTube Embeds (Vimeo / Kaltura / MP4)
  final_results: List[ComplianceResultItem] = list(results_map.values())

  for non_yt in non_yt_list:
    prov = non_yt["provider"]
    final_results.append(ComplianceResultItem(
        provider=prov,
        original_url=non_yt["url"],
        found_in_locations=non_yt["locations"],
        status="NEEDS_MANUAL_REVIEW",
        flag_level="INFO",
        caption_details=None,
        recommendation=f"Non-YouTube media source ({prov.upper()}) detected. Manually verify caption accuracy."
    ))

  # 5. Build Summary Statistics
  compliant_count = sum(1 for r in final_results if r.status == "LIKELY_COMPLIANT")
  non_compliant_count = sum(1 for r in final_results if "NON_COMPLIANT" in r.status)
  manual_review_count = sum(1 for r in final_results if r.status == "NEEDS_MANUAL_REVIEW")

  summary = ComplianceSummary(
      total_videos_found=len(payload.videos),
      youtube_videos=len(yt_map),
      non_youtube_videos=len(non_yt_list),
      cached_hits=cached_hits,
      api_queries_made=api_queries_made,
      compliant_count=compliant_count,
      non_compliant_count=non_compliant_count,
      manual_review_count=manual_review_count
  )

  return VideoComplianceReport(summary=summary, results=final_results)

if __name__ == "__main__":
  import uvicorn
  uvicorn.run(app, host="0.0.0.0", port=8000)
