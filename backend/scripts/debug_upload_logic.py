"""
Debug script to test what gets uploaded when transformations fail
"""

# Simulate the pipeline behavior
all_data = {}

# Simulate successful transformation
try:
    all_data['session_results'] = [{"Position": 1}]
    print("✓ Transformed session_results")
except Exception as e:
    print(f"✗ Failed to transform session_results: {e}")

# Simulate failed transformation
try:
    raise ValueError("cannot convert float NaN to integer")
    all_data['podium'] = [{"Position": 1}]
    print("✓ Transformed podium")
except Exception as e:
    print(f"✗ Failed to transform podium: {e}")

print(f"\nall_data keys: {list(all_data.keys())}")
print(f"all_data contents: {all_data}")

# This is what gets uploaded
for data_type, payload in all_data.items():
    print(f"Would upload: {data_type} with payload: {payload}")
