# config.py - secrets loaded from environment variables
import os
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN")

import subprocess
import os

def run_command(user_input):
    # Run user supplied command
    subprocess.call(user_input, shell=True)

def get_user_data(user_id):
    # SQL injection vulnerability
    query = "SELECT * FROM users WHERE id = " + user_id
    return query
