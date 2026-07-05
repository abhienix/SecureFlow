import subprocess

# Test file - intentional SAST vulnerability for Semgrep gate verification
# This uses shell=True with user input which is flagged as OS command injection
def run_check(user_input):
    # Insecure: passing user-controlled input directly to shell
    subprocess.run(user_input, shell=True)

def login(username, password):
    # SQL injection pattern - string formatting in query
    query = "SELECT * FROM users WHERE username = '%s' AND password = '%s'" % (username, password)
    return query
