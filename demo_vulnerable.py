# Dummy AWS key (for Gitleaks)
AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE"
AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"

import os

def run(cmd):
    os.system(cmd)   # Semgrep should flag this
