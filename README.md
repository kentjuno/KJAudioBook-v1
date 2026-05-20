# AudioBook KJ

Source-only public snapshot for reference, experimentation, and learning.

This repository intentionally excludes generated media, local databases, virtual environments, node modules, private voice references, planning notes, and manuscript/reference content. The code may need local adjustment before it runs on another machine.

## AI Agent Setup Prompt

Copy this prompt into any coding AI agent after cloning the repository:

```text
You are helping me set up and run this cloned project locally.

Goal:
- Inspect the repository structure first.
- Identify the backend, frontend, package managers, runtime versions, and entry points.
- Install only the dependencies needed to run the source code.
- Recreate ignored/generated folders only when needed.
- Do not restore private assets, voice samples, generated audio/video, local databases, node_modules, virtual environments, or planning/manuscript files.
- Prefer safe local setup steps and explain any command before running it.

Repository context:
- This is a source-only public snapshot.
- Some assets and generated files were intentionally removed by .gitignore.
- The project is not guaranteed to run immediately after clone.
- Treat missing media/output files as expected.
- Use placeholder environment variables for secrets/API keys.

Suggested workflow:
1. Read README files, package files, requirements files, and obvious app entry points.
2. Check the frontend folder for package.json and install frontend dependencies.
3. Check the audiobook_builder folder for Python requirements and create a local virtual environment.
4. Look for .env usage and create a local .env.example or .env only with placeholders.
5. Start backend and frontend separately if applicable.
6. If startup fails because ignored assets or databases are missing, create minimal placeholders or explain what is missing.
7. Summarize the final setup commands and how to run the app.

Constraints:
- Do not commit secrets.
- Do not download large model/media files unless I explicitly approve.
- Do not add generated outputs to Git.
- Keep changes small and focused on local setup.

Please begin by listing the detected project structure and then propose the exact setup commands for my machine.
```

## Likely Local Setup

The project appears to contain:

- `frontend/`: Vite/React frontend.
- `audiobook_builder/`: Python backend and audiobook tooling.

Typical commands an AI agent may try after inspection:

```powershell
cd frontend
npm install
npm run dev
```

```powershell
cd audiobook_builder
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python server.py
```

extension ref: https://github.com/crisng95/flowkit

These commands are starting points only. Let the AI agent inspect the current machine and adjust them.
