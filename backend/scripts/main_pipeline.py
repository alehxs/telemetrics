"""
Main data pipeline orchestrator
Fetches F1 data from FastF1, transforms it, and uploads to Supabase
"""
import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List
import fastf1

from config import YEARS, SESSION_TYPES, DATA_DIR, LOGS_DIR
from fastf1_extractor import FastF1Extractor
from data_transformers import DataTransformer
from supabase_uploader import SupabaseUploader

# Setup logging
log_file = LOGS_DIR / f"pipeline_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class F1DataPipeline:
    """Main F1 data pipeline"""

    def __init__(self):
        self.uploader = SupabaseUploader()
        self.stats = {
            'total_sessions': 0,
            'successful_sessions': 0,
            'failed_sessions': 0,
            'total_data_types': 0,
            'failed_data_types': 0
        }

    def get_events_for_year(self, year: int) -> List[str]:
        """Get list of Grand Prix events for a given year"""
        try:
            schedule = fastf1.get_event_schedule(year)
            # Filter for actual race events (not testing)
            events = schedule[schedule['EventFormat'] != 'testing']['EventName'].tolist()
            logger.info(f"Found {len(events)} events for {year}")
            return events
        except Exception as e:
            logger.error(f"Failed to get schedule for {year}: {e}")
            return []

    def save_json_backup(
        self,
        year: int,
        grand_prix: str,
        session: str,
        all_data: Dict[str, Any]
    ) -> None:
        """Save JSON backup of processed data"""
        try:
            # Create year directory
            year_dir = DATA_DIR / str(year)
            year_dir.mkdir(exist_ok=True)

            # Sanitize filename
            gp_safe = grand_prix.replace(' ', '_').replace('/', '-')
            filename = f"{year}_{gp_safe}_{session}.json"
            filepath = year_dir / filename

            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(all_data, f, indent=2, ensure_ascii=False)

            logger.info(f"✓ Saved JSON backup: {filepath}")
        except Exception as e:
            logger.error(f"✗ Failed to save JSON backup: {e}")

    def process_session(
        self,
        year: int,
        grand_prix: str,
        session_type: str
    ) -> bool:
        """Process a single session"""
        logger.info(f"\n{'='*80}")
        logger.info(f"Processing: {year} {grand_prix} {session_type}")
        logger.info(f"{'='*80}")

        self.stats['total_sessions'] += 1

        try:
            # Step 1: Extract data from FastF1
            extractor = FastF1Extractor(year, grand_prix, session_type)
            if not extractor.load_session():
                logger.warning(f"Skipping - could not load session")
                self.stats['failed_sessions'] += 1
                return False

            # Step 2: Transform data
            transformer = DataTransformer(extractor)

            all_data = {}

            try:
                all_data['session_results'] = transformer.transform_session_results()
                logger.info("✓ Transformed session_results")
            except Exception as e:
                logger.error(f"✗ Failed to transform session_results: {e}")
                all_data['session_results'] = []

            try:
                all_data['podium'] = transformer.transform_podium()
                logger.info("✓ Transformed podium")
            except Exception as e:
                logger.error(f"✗ Failed to transform podium: {e}")
                all_data['podium'] = []

            try:
                all_data['fastest_lap'] = transformer.transform_fastest_lap()
                logger.info("✓ Transformed fastest_lap")
            except Exception as e:
                logger.error(f"✗ Failed to transform fastest_lap: {e}")
                all_data['fastest_lap'] = None

            try:
                all_data['get_session_data'] = transformer.transform_session_info()
                logger.info("✓ Transformed get_session_data")
            except Exception as e:
                logger.error(f"✗ Failed to transform get_session_data: {e}")
                all_data['get_session_data'] = {}

            try:
                all_data['track_dominance'] = transformer.transform_track_dominance()
                logger.info("✓ Transformed track_dominance (top 2 finishers)")
            except Exception as e:
                logger.error(f"✗ Failed to transform track_dominance: {e}")
                all_data['track_dominance'] = {'drivers': [], 'teamColors': [], 'segments': []}

            try:
                all_data['tyres'] = transformer.transform_tyres()
                logger.info("✓ Transformed tyres")
            except Exception as e:
                logger.error(f"✗ Failed to transform tyres: {e}")
                all_data['tyres'] = []

            try:
                all_data['lap_chart_data'] = transformer.transform_lap_chart_data()
                logger.info("✓ Transformed lap_chart_data")
            except Exception as e:
                logger.error(f"✗ Failed to transform lap_chart_data: {e}")
                all_data['lap_chart_data'] = {'podium': [], 'laps': []}

            # Step 3: Save JSON backup
            self.save_json_backup(year, grand_prix, session_type, all_data)

            # Step 4: Filter out empty payloads
            filtered_data = {}
            for data_type, payload in all_data.items():
                # Check if payload is empty (empty list, empty dict, None, etc.)
                is_empty = (
                    payload is None or
                    (isinstance(payload, (list, dict)) and len(payload) == 0)
                )
                if is_empty:
                    logger.warning(f"⚠ Skipping empty payload for {data_type}")
                else:
                    filtered_data[data_type] = payload

            # Step 5: Upload to Supabase (only non-empty payloads)
            if filtered_data:
                upload_results = self.uploader.upload_session(
                    year, grand_prix, session_type, filtered_data
                )

                self.stats['total_data_types'] += len(upload_results)
                self.stats['failed_data_types'] += sum(1 for success in upload_results.values() if not success)
            else:
                logger.warning(f"⚠ No valid data to upload for this session")

            self.stats['successful_sessions'] += 1
            logger.info(f"✓ Session processed successfully")
            return True

        except Exception as e:
            logger.error(f"✗ Failed to process session: {e}", exc_info=True)
            self.stats['failed_sessions'] += 1
            return False

    def run(
        self,
        years: List[int] = None,
        specific_gp: str = None,
        specific_session: str = None
    ) -> None:
        """
        Run the full pipeline

        Args:
            years: List of years to process (default: all from config)
            specific_gp: Process only this Grand Prix (default: all)
            specific_session: Process only this session type (default: all)
        """
        if years is None:
            years = YEARS

        logger.info(f"\n{'#'*80}")
        logger.info(f"Starting F1 Data Pipeline")
        logger.info(f"Years: {years}")
        logger.info(f"Sessions: {SESSION_TYPES if not specific_session else [specific_session]}")
        logger.info(f"{'#'*80}\n")

        start_time = datetime.now()

        for year in years:
            logger.info(f"\n{'*'*80}")
            logger.info(f"YEAR: {year}")
            logger.info(f"{'*'*80}")

            events = self.get_events_for_year(year)

            if specific_gp:
                events = [e for e in events if specific_gp.lower() in e.lower()]

            for grand_prix in events:
                sessions = [specific_session] if specific_session else SESSION_TYPES

                for session_type in sessions:
                    try:
                        self.process_session(year, grand_prix, session_type)
                    except KeyboardInterrupt:
                        logger.warning("\n\nPipeline interrupted by user")
                        self.print_stats()
                        return
                    except Exception as e:
                        logger.error(f"Unexpected error: {e}", exc_info=True)
                        continue

        end_time = datetime.now()
        duration = end_time - start_time

        logger.info(f"\n{'#'*80}")
        logger.info(f"Pipeline completed in {duration}")
        logger.info(f"{'#'*80}\n")

        self.print_stats()

    def print_stats(self) -> None:
        """Print pipeline statistics"""
        logger.info(f"\n{'='*80}")
        logger.info(f"PIPELINE STATISTICS")
        logger.info(f"{'='*80}")
        logger.info(f"Total sessions processed: {self.stats['total_sessions']}")
        logger.info(f"Successful sessions: {self.stats['successful_sessions']}")
        logger.info(f"Failed sessions: {self.stats['failed_sessions']}")
        logger.info(f"Total data types processed: {self.stats['total_data_types']}")
        logger.info(f"Failed data types: {self.stats['failed_data_types']}")

        if self.stats['total_sessions'] > 0:
            success_rate = (self.stats['successful_sessions'] / self.stats['total_sessions']) * 100
            logger.info(f"Success rate: {success_rate:.1f}%")

        logger.info(f"{'='*80}\n")


def main():
    """Entry point"""
    import argparse

    parser = argparse.ArgumentParser(description='F1 Telemetry Data Pipeline')
    parser.add_argument('--year', type=int, help='Process specific year only')
    parser.add_argument('--gp', type=str, help='Process specific Grand Prix only')
    parser.add_argument('--session', type=str, choices=['Race', 'Qualifying', 'Sprint'],
                       help='Process specific session type only')

    args = parser.parse_args()

    pipeline = F1DataPipeline()

    years = [args.year] if args.year else None

    pipeline.run(
        years=years,
        specific_gp=args.gp,
        specific_session=args.session
    )


if __name__ == "__main__":
    main()
