"""
Debug script to test transformation on a specific session with empty payload
"""
import logging
import pandas as pd
from fastf1_extractor import FastF1Extractor
from data_transformers import DataTransformer

# Setup logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def debug_session(year, grand_prix, session_type):
    """Debug a specific session to see why payloads are empty"""

    print("\n" + "="*80)
    print(f"DEBUGGING: {year} {grand_prix} {session_type}")
    print("="*80)

    # Step 1: Extract
    extractor = FastF1Extractor(year, grand_prix, session_type)
    if not extractor.load_session():
        print("ERROR: Could not load session")
        return

    print("\n✓ Session loaded successfully")

    # Step 2: Check driver standings
    print("\n--- Checking get_driver_standings() ---")
    try:
        standings = extractor.get_driver_standings()
        print(f"Type: {type(standings)}")
        print(f"Shape: {standings.shape}")
        print(f"Empty: {standings.empty}")
        print(f"Columns: {list(standings.columns)}")

        if not standings.empty:
            print(f"\nFirst few rows:")
            print(standings[['Position', 'Abbreviation', 'TeamName']].head())
        else:
            print("\nWARNING: standings DataFrame is EMPTY!")

    except Exception as e:
        print(f"ERROR in get_driver_standings: {e}")
        import traceback
        traceback.print_exc()

    # Step 3: Try to transform
    print("\n--- Attempting transform_session_results() ---")
    try:
        transformer = DataTransformer(extractor)
        session_results = transformer.transform_session_results()

        print(f"Result type: {type(session_results)}")
        print(f"Result length: {len(session_results)}")
        print(f"Result content: {session_results}")

    except Exception as e:
        print(f"ERROR in transform_session_results: {e}")
        import traceback
        traceback.print_exc()

    # Step 4: Try to transform podium
    print("\n--- Attempting transform_podium() ---")
    try:
        transformer = DataTransformer(extractor)
        podium = transformer.transform_podium()

        print(f"Result type: {type(podium)}")
        print(f"Result length: {len(podium)}")
        print(f"Result content: {podium}")

    except Exception as e:
        print(f"ERROR in transform_podium: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    # Test a session that has empty payloads
    debug_session(2022, "United States Grand Prix", "Practice 2")

    print("\n\n")

    # Test a session that has valid payloads (for comparison)
    debug_session(2018, "Australian Grand Prix", "Race")
