"""
Auth Service — Handles database interactions for authentication.
"""
from typing import Dict, Any, Tuple
from src.utils.supabase_client import get_supabase
from src.utils.auth_utils import hash_password, verify_password, generate_jwt

class AuthService:
    
    @staticmethod
    def login(email: str, password: str, role: str) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Attempts to log in a user.
        Returns: (success_bool, message_str, user_dict_or_token)
        """
        try:
            sb = get_supabase()
            res = sb.table("users").select("*").eq("email", email).eq("role", role).execute()
            users = res.data or []
            user = users[0] if users else None
            
            if user and verify_password(password, user["hashed_password"]):
                # Generate a JWT for this session
                token = generate_jwt({
                    "sub": user["id"],
                    "email": user["email"],
                    "role": user["role"]
                })
                
                # Return safe user object (no password) + token
                safe_user = {
                    "id": user["id"],
                    "email": user["email"],
                    "name": user.get("name", email.split("@")[0]),
                    "role": user["role"],
                    "token": token
                }
                return True, "Login successful.", safe_user
            else:
                return False, "Invalid email or password.", {}
                
        except Exception as e:
            return False, f"Database error during login: {str(e)}", {}

    @staticmethod
    def register(name: str, email: str, password: str, role: str) -> Tuple[bool, str]:
        """
        Attempts to register a new user.
        Returns: (success_bool, message_str)
        """
        try:
            sb = get_supabase()
            
            # Check if email exists
            check_res = sb.table("users").select("id").eq("email", email).execute()
            if check_res.data:
                return False, "Email is already registered."
                
            hashed = hash_password(password)
            sb.table("users").insert({
                "name": name, 
                "email": email,
                "hashed_password": hashed, 
                "role": role
            }).execute()
            
            return True, "Account created successfully."
            
        except Exception as e:
            return False, f"Database error during registration: {str(e)}"
