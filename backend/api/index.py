import sys
import os

# Add backend root directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

# Export app for serverless entry point
__all__ = ["app"]
