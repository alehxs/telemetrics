"""
Debug script to check database payloads
"""
import json
from supabase import create_client
from config import SUPABASE_URL, SUPABASE_SERVICE_KEY

def check_payloads():
    """Query database to check session_results and podium payloads"""
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Query for session_results
    print("\n" + "="*80)
    print("CHECKING SESSION_RESULTS PAYLOADS")
    print("="*80)

    response = client.table('telemetry_data').select('*').eq('data_type', 'session_results').limit(5).execute()

    print(f"\nFound {len(response.data)} session_results records")

    for i, record in enumerate(response.data, 1):
        print(f"\n--- Record {i} ---")
        print(f"Year: {record['year']}")
        print(f"Grand Prix: {record['grand_prix']}")
        print(f"Session: {record['session']}")
        print(f"Payload type: {type(record['payload'])}")
        print(f"Payload content: {json.dumps(record['payload'], indent=2)[:500]}")

        if isinstance(record['payload'], list):
            print(f"Payload is a list with {len(record['payload'])} items")
        elif isinstance(record['payload'], dict):
            print(f"Payload is a dict with keys: {list(record['payload'].keys())}")
        else:
            print(f"Payload is: {record['payload']}")

    # Query for podium
    print("\n" + "="*80)
    print("CHECKING PODIUM PAYLOADS")
    print("="*80)

    response = client.table('telemetry_data').select('*').eq('data_type', 'podium').limit(5).execute()

    print(f"\nFound {len(response.data)} podium records")

    for i, record in enumerate(response.data, 1):
        print(f"\n--- Record {i} ---")
        print(f"Year: {record['year']}")
        print(f"Grand Prix: {record['grand_prix']}")
        print(f"Session: {record['session']}")
        print(f"Payload type: {type(record['payload'])}")
        print(f"Payload content: {json.dumps(record['payload'], indent=2)[:500]}")

        if isinstance(record['payload'], list):
            print(f"Payload is a list with {len(record['payload'])} items")
        elif isinstance(record['payload'], dict):
            print(f"Payload is a dict with keys: {list(record['payload'].keys())}")
        else:
            print(f"Payload is: {record['payload']}")

    # Check all data types to see which have empty payloads
    print("\n" + "="*80)
    print("CHECKING ALL DATA TYPES FOR EMPTY PAYLOADS")
    print("="*80)

    data_types = ['session_results', 'podium', 'fastest_lap', 'track_dominance', 'tyres', 'lap_chart_data', 'get_session_data']

    for data_type in data_types:
        response = client.table('telemetry_data').select('payload').eq('data_type', data_type).limit(10).execute()

        empty_count = 0
        total_count = len(response.data)

        for record in response.data:
            payload = record['payload']
            if payload is None or payload == [] or payload == {}:
                empty_count += 1

        print(f"{data_type}: {empty_count}/{total_count} empty payloads")

if __name__ == "__main__":
    check_payloads()
