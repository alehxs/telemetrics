"""
Upload data to Supabase
"""
import logging
from typing import Dict, Any
from supabase import create_client, Client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

logger = logging.getLogger(__name__)


class SupabaseUploader:
    """Upload telemetry data to Supabase"""

    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise ValueError("Missing Supabase credentials in .env")

        self.client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
        logger.info("Supabase client initialized")

    def upload_data(
        self,
        year: int,
        grand_prix: str,
        session: str,
        data_type: str,
        payload: Any
    ) -> bool:
        """
        Upload single data entry to Supabase

        Uses upsert to handle duplicates gracefully
        """
        try:
            data = {
                'year': year,
                'grand_prix': grand_prix,
                'session': session,
                'data_type': data_type,
                'payload': payload
            }

            # Upsert (insert or update if exists)
            response = self.client.table('telemetry_data').upsert(
                data,
                on_conflict='year,grand_prix,session,data_type'
            ).execute()

            logger.info(f"✓ Uploaded {year} {grand_prix} {session} - {data_type}")
            return True

        except Exception as e:
            logger.error(f"✗ Failed to upload {data_type}: {e}")
            return False

    def upload_session(
        self,
        year: int,
        grand_prix: str,
        session: str,
        all_data: Dict[str, Any]
    ) -> Dict[str, bool]:
        """
        Upload all data types for a session

        Returns dict of data_type -> success status
        """
        results = {}

        for data_type, payload in all_data.items():
            success = self.upload_data(year, grand_prix, session, data_type, payload)
            results[data_type] = success

        return results
