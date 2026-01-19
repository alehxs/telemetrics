"""
Debug script to identify which sessions have empty payloads
"""
import json
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

def check_empty_payloads():
    """Find all records with empty payloads"""
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    print("\n" + "="*80)
    print("SESSIONS WITH EMPTY session_results PAYLOADS")
    print("="*80)

    response = client.table('telemetry_data').select('*').eq('data_type', 'session_results').execute()

    empty_sessions = []
    for record in response.data:
        payload = record['payload']
        if payload is None or payload == [] or payload == {}:
            empty_sessions.append(record)

    print(f"\nFound {len(empty_sessions)} sessions with empty session_results:")
    for record in empty_sessions:
        print(f"  - {record['year']} {record['grand_prix']} {record['session']}")

    print("\n" + "="*80)
    print("SESSIONS WITH EMPTY podium PAYLOADS")
    print("="*80)

    response = client.table('telemetry_data').select('*').eq('data_type', 'podium').execute()

    empty_podiums = []
    for record in response.data:
        payload = record['payload']
        if payload is None or payload == [] or payload == {}:
            empty_podiums.append(record)

    print(f"\nFound {len(empty_podiums)} sessions with empty podium:")
    for record in empty_podiums:
        print(f"  - {record['year']} {record['grand_prix']} {record['session']}")

if __name__ == "__main__":
    check_empty_payloads()
