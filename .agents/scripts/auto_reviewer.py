import sys
import json
import os

def main():
    try:
        input_data = sys.stdin.read()
        if not input_data:
            print(json.dumps({}))
            return
            
        payload = json.loads(input_data)
        
        # We can read the transcript to see if the last tool was a code generation tool
        transcript_path = payload.get("transcriptPath")
        should_trigger = False
        
        if transcript_path and os.path.exists(transcript_path):
            try:
                # Read the last few lines to check for file edits
                with open(transcript_path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                    # Check the last 10 steps
                    for line in lines[-10:]:
                        try:
                            step = json.loads(line)
                            if step.get("type") == "PLANNER_RESPONSE":
                                for call in step.get("tool_calls", []):
                                    name = call.get("name", "")
                                    if name in ["write_to_file", "replace_file_content", "multi_replace_file_content"]:
                                        should_trigger = True
                        except:
                            pass
            except:
                should_trigger = True # Default to true if we can't read it
        else:
            should_trigger = True

        if should_trigger:
            response = {
                "injectSteps": [
                    {
                        "ephemeralMessage": "🔴 AUTO-TRIGGER: HỆ THỐNG YÊU CẦU REVIEW! Bạn PHẢI in ra một báo cáo Code Review ngắn gọn theo 101-react-tips.md cho đoạn code vừa sinh."
                    }
                ]
            }
        else:
            response = {}
            
        print(json.dumps(response))
        
    except Exception as e:
        print(json.dumps({}))

if __name__ == "__main__":
    main()
