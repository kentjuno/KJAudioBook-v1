import asyncio
import json
import uuid
import time
from flow_service import FlowService

async def test_endpoints():
    fs = FlowService()
    # Need to connect to WS.
    # Actually we can't test without the extension.
