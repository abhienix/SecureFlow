# ===========================
# SecureFlow TEST FILE
# Gitleaks + Semgrep test
# ===========================

import os

# 🔴 GITLEAKS TEST CASES (fake secrets only)
AWS_ACCESS_KEY_ID = "AKIA_TEST_KEY_123456789"
AWS_SECRET_ACCESS_KEY = "secret_test_key_abcdefg"

GITHUB_TOKEN = "ghp_test_fake_token_123456"

API_KEY = "sk_test_1234567890abcdef"


# 🔴 SAST TEST CASES (Semgrep patterns)
def unsafe_code():
    os.system("ls")   # dangerous pattern (should trigger SAST)
    eval("print('test')")  # unsafe eval usage

def sql_injection(user_input):
    query = "SELECT * FROM users WHERE id = " + user_input  # vulnerable pattern
    return query


# normal safe code
def hello():
    print("SecureFlow test file running")