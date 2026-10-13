import os
import uvicorn

if __name__ == "__main__":
    # Render and other cloud platforms provide the PORT environment variable
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"Starting Personal Health Copilot on {host}:{port}")
    uvicorn.run("app.main:app", host=host, port=port)
