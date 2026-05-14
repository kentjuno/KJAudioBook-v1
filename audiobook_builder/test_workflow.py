import asyncio
from flow_service import flow_service

async def main():
    op_id = "edfdcace-f3d3-4c7a-9636-ea8e475fcfd4"
    url = flow_service._build_url(f"/v1/workflows/{op_id}?clientContext.tool=PINHOLE")
    res = await flow_service._send("api_request", {
        "url": url,
        "method": "GET",
        "headers": {"content-type": "application/json"},
        "body": None
    })
    print(res)

if __name__ == "__main__":
    asyncio.run(main())
