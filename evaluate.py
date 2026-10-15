#!/usr/bin/env python3
"""Root forwarder for evaluate.py."""
import sys
import os

backend_eval = os.path.join(os.path.dirname(__file__), "backend", "evaluate.py")
if __name__ == "__main__":
    from backend.evaluate import main
    main()
