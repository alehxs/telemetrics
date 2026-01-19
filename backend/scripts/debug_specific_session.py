"""
Debug script to check what's actually in the database for a specific session
"""
import json
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

def check_specific_session():
    """Check a specific session that has empty payloads"""
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    year = 2022
    grand_prix = "United States Grand Prix"
    session = "Practice 2"

    print(f"\nChecking: {year} {grand_prix} {session}")
    print("="*80)

    # Get ALL data types for this session
    response = client.table('telemetry_data').select('*').eq('year', year).eq('grand_prix', grand_prix).eq('session', session).execute()

    print(f"\nFound {len(response.data)} records for this session")

    for record in response.data:
        print(f"\n--- {record['data_type']} ---")
        print(f"Payload type: {type(record['payload'])}")

        if isinstance(record['payload'], list):
            print(f"Payload length: {len(record['payload'])}")
            if len(record['payload']) > 0:
                print(f"First item: {json.dumps(record['payload'][0], indent=2)[:200]}")
            else:
                print("EMPTY LIST!")
        elif isinstance(record['payload'], dict):
            print(f"Payload keys: {list(record['payload'].keys())}")
            print(f"Payload: {json.dumps(record['payload'], indent=2)[:200]}")
        else:
            print(f"Payload: {record['payload']}")

if __name__ == "__main__":
    check_specific_session()
