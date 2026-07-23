"""Quick test: verify .env loading and Bedrock connectivity."""
import os
import sys
import json
from pathlib import Path

sys.path.insert(0, "src")

# Load .env like audit_runner does
env_path = Path(".env")
print(f"1. .env file exists: {env_path.exists()}")
if env_path.exists():
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key and val:
                    os.environ.setdefault(key, val)

key_id = os.environ.get("AWS_ACCESS_KEY_ID", "NOT SET")
print(f"2. AWS_ACCESS_KEY_ID: {key_id[:10]}...")
print(f"3. AWS_SESSION_TOKEN set: {'Yes' if os.environ.get('AWS_SESSION_TOKEN') else 'No'}")
print(f"4. Region: {os.environ.get('AWS_DEFAULT_REGION', 'NOT SET')}")

# Try boto3
import boto3
client = boto3.client("bedrock-runtime", region_name="us-west-2")
print("5. Boto3 client created OK")

# Try actual Bedrock call
try:
    body = json.dumps({
        "anthropic_version": "bedrock-2023-05-31",
        "max_tokens": 10,
        "messages": [{"role": "user", "content": "Say hi"}],
    })
    resp = client.invoke_model(
        modelId="us.anthropic.claude-sonnet-4-5-20250929-v1:0",
        contentType="application/json",
        accept="application/json",
        body=body,
    )
    result = json.loads(resp["body"].read())
    print(f"6. SUCCESS! Bedrock responded: {result['content'][0]['text']}")
except Exception as e:
    print(f"6. BEDROCK ERROR: {type(e).__name__}: {e}")
