import { NextRequest, NextResponse } from 'next/server';

export interface CaptionTrackInput {
  kind?: string; // 'asr' for auto-generated, or ''/null/'standard' for manual
  language?: string;
  name?: string;
}

export interface VideoInputItem {
  url: string;
  embed_code?: string;
  location?: string;
  tracks?: CaptionTrackInput[];
}

export interface VideoComplianceRequest {
  videos: VideoInputItem[];
  api_key?: string;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  return match ? match[1] : null;
}

function detectProvider(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('vimeo.com')) return 'vimeo';
  if (lower.includes('panopto')) return 'panopto';
  if (lower.includes('kaltura')) return 'kaltura';
  return 'other';
}

/**
 * YouTube Caption Truth Table Evaluator:
 * 1. PASS (LIKELY_COMPLIANT): Has AT LEAST ONE manual caption track (`track.kind !== 'asr'`). Auto captions alongside manual track are allowed and pass.
 * 2. FAIL (NON_COMPLIANT_AUTO_CAPTIONS): ONLY has auto-generated captions (`track.kind === 'asr'`) and no manual captions exist.
 * 3. FAIL (NON_COMPLIANT_MISSING_CAPTIONS): NO captions exist at all.
 */
function evaluateCaptionTracks(tracks?: CaptionTrackInput[], hasApiCaptionParam?: boolean, titleText?: string) {
  if (tracks && tracks.length > 0) {
    const hasManualTrack = tracks.some(t => t.kind && t.kind.toLowerCase() !== 'asr');
    const hasAutoOnly = tracks.every(t => t.kind && t.kind.toLowerCase() === 'asr');

    if (hasManualTrack) {
      return {
        status: 'LIKELY_COMPLIANT',
        flag_level: 'INFO',
        caption_details: { has_captions: true, is_auto_generated: false, language: 'en' },
        recommendation: 'Manually verified human caption track detected.'
      };
    } else if (hasAutoOnly) {
      return {
        status: 'NON_COMPLIANT_AUTO_CAPTIONS',
        flag_level: 'WARNING',
        caption_details: { has_captions: true, is_auto_generated: true, language: 'en' },
        recommendation: 'Replace or edit automatic speech recognition (ASR) captions with a verified human caption track.'
      };
    }
  }

  // Fallback heuristic if tracks array not explicitly provided
  const lowerTitle = (titleText || '').toLowerCase();
  const isAutoInTitle = lowerTitle.includes('auto-generated') || lowerTitle.includes('asr captions');

  if (hasApiCaptionParam && !isAutoInTitle) {
    return {
      status: 'LIKELY_COMPLIANT',
      flag_level: 'INFO',
      caption_details: { has_captions: true, is_auto_generated: false, language: 'en' },
      recommendation: 'Manually verified human caption track detected.'
    };
  } else if (hasApiCaptionParam && isAutoInTitle) {
    return {
      status: 'NON_COMPLIANT_AUTO_CAPTIONS',
      flag_level: 'WARNING',
      caption_details: { has_captions: true, is_auto_generated: true, language: 'en' },
      recommendation: 'Replace or edit automatic speech recognition (ASR) captions with a verified human caption track.'
    };
  }

  return {
    status: 'NON_COMPLIANT_MISSING_CAPTIONS',
    flag_level: 'CRITICAL',
    caption_details: { has_captions: false, is_auto_generated: false, language: 'unknown' },
    recommendation: 'No closed captions detected. Add accurate human-edited closed captions or a transcript.'
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: VideoComplianceRequest = await req.json();
    const videos = body.videos || [];
    const apiKey = body.api_key || process.env.YOUTUBE_API_KEY;

    const ytMap: Record<string, { id: string; url: string; locations: string[]; tracks?: CaptionTrackInput[] }> = {};
    const nonYtList: { provider: string; url: string; locations: string[] }[] = [];

    // 1. Extract & Deduplicate
    videos.forEach(v => {
      const ytId = extractYouTubeId(v.url);
      const loc = v.location || 'course_content';
      if (ytId) {
        if (!ytMap[ytId]) {
          ytMap[ytId] = { id: ytId, url: v.url, locations: [loc], tracks: v.tracks };
        } else {
          if (!ytMap[ytId].locations.includes(loc)) {
            ytMap[ytId].locations.push(loc);
          }
          if (v.tracks && v.tracks.length > 0) {
            ytMap[ytId].tracks = [...(ytMap[ytId].tracks || []), ...v.tracks];
          }
        }
      } else {
        nonYtList.push({
          provider: detectProvider(v.url),
          url: v.url,
          locations: [loc]
        });
      }
    });

    const ytIds = Object.keys(ytMap);
    let apiQueriesMade = 0;
    const results: any[] = [];

    // 2. Batch Query YouTube Data API if key exists
    if (apiKey && ytIds.length > 0) {
      for (let i = 0; i < ytIds.length; i += 50) {
        const chunk = ytIds.slice(i, i + 50);
        apiQueriesMade++;

        try {
          const ytUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${chunk.join(',')}&key=${apiKey}`;
          const res = await fetch(ytUrl);
          if (res.ok) {
            const data = await res.json();
            const itemsById: Record<string, any> = {};
            (data.items || []).forEach((item: any) => { itemsById[item.id] = item; });

            chunk.forEach(yid => {
              const itemData = itemsById[yid];
              const inputTracks = ytMap[yid].tracks;
              if (!itemData && (!inputTracks || inputTracks.length === 0)) {
                results.push({
                  youtube_video_id: yid,
                  original_url: ytMap[yid].url,
                  found_in_locations: ytMap[yid].locations,
                  status: 'NON_COMPLIANT_MISSING_CAPTIONS',
                  flag_level: 'CRITICAL',
                  caption_details: { has_captions: false, is_auto_generated: false, language: 'unknown' },
                  recommendation: 'Video unavailable or private. Replace with accessible video.'
                });
              } else {
                const hasCaptions = itemData?.contentDetails?.caption === 'true';
                const title = itemData?.snippet?.title || '';
                const evalRes = evaluateCaptionTracks(inputTracks, hasCaptions, title);

                results.push({
                  youtube_video_id: yid,
                  original_url: ytMap[yid].url,
                  found_in_locations: ytMap[yid].locations,
                  ...evalRes
                });
              }
            });
          }
        } catch (e) {
          // Fallback on error
        }
      }
    }

    // 3. Fallback for unhandled YouTube IDs
    ytIds.forEach(yid => {
      if (!results.some(r => r.youtube_video_id === yid)) {
        const rawUrl = ytMap[yid].url;
        const inputTracks = ytMap[yid].tracks;
        const hasCC = rawUrl.includes('cc_load_policy=1');

        let evalRes;
        if (inputTracks && inputTracks.length > 0) {
          evalRes = evaluateCaptionTracks(inputTracks, hasCC, rawUrl);
        } else {
          evalRes = {
            status: hasCC ? 'LIKELY_COMPLIANT' : 'NON_COMPLIANT_AUTO_CAPTIONS',
            flag_level: hasCC ? 'INFO' : 'WARNING',
            caption_details: { has_captions: true, is_auto_generated: !hasCC, language: 'en' },
            recommendation: hasCC 
              ? 'Closed caption parameter detected on embed tag.'
              : 'Replace or edit automatic speech recognition (ASR) captions with a verified human caption track.'
          };
        }

        results.push({
          youtube_video_id: yid,
          original_url: rawUrl,
          found_in_locations: ytMap[yid].locations,
          ...evalRes
        });
      }
    });

    // 4. Non-YouTube Embeds
    nonYtList.forEach(n => {
      results.push({
        provider: n.provider,
        original_url: n.url,
        found_in_locations: n.locations,
        status: 'NEEDS_MANUAL_REVIEW',
        flag_level: 'INFO',
        recommendation: `Non-YouTube media source (${n.provider.toUpperCase()}) detected. Manually verify caption accuracy in ${n.provider}.`
      });
    });

    // 5. Summary Statistics
    const compliant_count = results.filter(r => r.status === 'LIKELY_COMPLIANT').length;
    const non_compliant_count = results.filter(r => r.status.includes('NON_COMPLIANT')).length;
    const manual_review_count = results.filter(r => r.status === 'NEEDS_MANUAL_REVIEW').length;

    return NextResponse.json({
      summary: {
        total_videos_found: videos.length,
        youtube_videos: ytIds.length,
        non_youtube_videos: nonYtList.length,
        cached_hits: 0,
        api_queries_made: apiQueriesMade,
        compliant_count,
        non_compliant_count,
        manual_review_count
      },
      results
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Video compliance check failed.' }, { status: 500 });
  }
}
