from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # OpenAI API
    openai_api_key: Optional[str] = None
    
    # AlphaVantage API
    alphavantage_api_key: Optional[str] = None
    
    # Massive API
    massive_api_key: Optional[str] = None
    
    # API Settings
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()


