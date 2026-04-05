"""
run.py
Flask Application Entry Point
-------------------------------
Loads environment variables and starts the Flask development server.
In production, use gunicorn: gunicorn -w 4 -b 0.0.0.0:5000 run:app
"""

import os
import sys

# Ensure the server directory is in the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv

# Load .env BEFORE importing create_app (config reads env vars at import time)
load_dotenv()

from app import create_app, db

app = create_app()


@app.cli.command("init-db")
def init_db():
    """CLI command: flask init-db — creates all tables."""
    with app.app_context():
        db.create_all()
        print("✅ Database tables created.")


if __name__ == "__main__":
    with app.app_context():
        db.create_all()  # Auto-create tables in development
        print("✅ Database ready.")
    app.run(debug=True, host="0.0.0.0", port=5000)