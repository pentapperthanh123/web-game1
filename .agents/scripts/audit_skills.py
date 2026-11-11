#!/usr/bin/env python3
"""
Skills Audit Script - AG Kit
Kiểm tra tính chuẩn chỉnh của tất cả skills
"""

import os
import re
from pathlib import Path
from collections import defaultdict

def check_frontmatter(file_path):
    """Check if file has valid frontmatter"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Check for frontmatter (---\n...\n---)
            if content.startswith('---\n'):
                # Find end of frontmatter
                end = content.find('\n---', 4)
                if end > 0:
                    frontmatter = content[4:end]
                    return True, frontmatter
            return False, None
    except Exception as e:
        return False, str(e)

def parse_frontmatter(frontmatter_text):
    """Parse frontmatter to extract fields"""
    fields = {}
    if not frontmatter_text:
        return fields
    
    for line in frontmatter_text.split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            fields[key.strip()] = value.strip()
    
    return fields

def audit_skills(skills_dir):
    """Audit all skills"""
    results = {
        'total': 0,
        'valid': 0,
        'missing_skill_md': [],
        'missing_frontmatter': [],
        'missing_name': [],
        'missing_description': [],
        'missing_when_to_use': [],
        'valid_skills': []
    }
    
    skills_path = Path(skills_dir)
    
    for skill_dir in sorted(skills_path.iterdir()):
        if not skill_dir.is_dir():
            continue
        
        results['total'] += 1
        skill_name = skill_dir.name
        skill_md = skill_dir / 'SKILL.md'
        
        # Check if SKILL.md exists
        if not skill_md.exists():
            results['missing_skill_md'].append(skill_name)
            continue
        
        # Check frontmatter
        has_frontmatter, frontmatter_text = check_frontmatter(skill_md)
        if not has_frontmatter:
            results['missing_frontmatter'].append(skill_name)
            continue
        
        # Parse frontmatter
        fields = parse_frontmatter(frontmatter_text)
        
        # Check required fields
        issues = []
        if 'name' not in fields or not fields['name']:
            results['missing_name'].append(skill_name)
            issues.append('name')
        
        if 'description' not in fields or not fields['description']:
            results['missing_description'].append(skill_name)
            issues.append('description')
        
        if 'when_to_use' not in fields or not fields['when_to_use']:
            results['missing_when_to_use'].append(skill_name)
            issues.append('when_to_use')
        
        if not issues:
            results['valid'] += 1
            results['valid_skills'].append(skill_name)
    
    return results

def print_report(results):
    """Print audit report"""
    print("=" * 70)
    print(" AG KIT - SKILLS AUDIT REPORT")
    print("=" * 70)
    print()
    
    total = results['total']
    valid = results['valid']
    percent = (valid / total * 100) if total > 0 else 0
    
    print(f"[Summary]")
    print(f"  Total Skills: {total}")
    print(f"  Valid Skills: {valid}")
    print(f"  Score: {percent:.2f}%")
    print()
    
    # Issues
    issues_count = 0
    
    if results['missing_skill_md']:
        issues_count += len(results['missing_skill_md'])
        print(f"[ERROR] Missing SKILL.md ({len(results['missing_skill_md'])}):")
        for skill in results['missing_skill_md']:
            print(f"   - {skill}")
        print()
    
    if results['missing_frontmatter']:
        issues_count += len(results['missing_frontmatter'])
        print(f"[WARNING] Missing Frontmatter ({len(results['missing_frontmatter'])}):")
        for skill in results['missing_frontmatter']:
            print(f"   - {skill}")
        print()
    
    if results['missing_name']:
        issues_count += len(results['missing_name'])
        print(f"[WARNING] Missing 'name' field ({len(results['missing_name'])}):")
        for skill in results['missing_name']:
            print(f"   - {skill}")
        print()
    
    if results['missing_description']:
        issues_count += len(results['missing_description'])
        print(f"[WARNING] Missing 'description' field ({len(results['missing_description'])}):")
        for skill in results['missing_description']:
            print(f"   - {skill}")
        print()
    
    if results['missing_when_to_use']:
        issues_count += len(results['missing_when_to_use'])
        print(f"[WARNING] Missing 'when_to_use' field ({len(results['missing_when_to_use'])}):")
        for skill in results['missing_when_to_use']:
            print(f"   - {skill}")
        print()
    
    if issues_count == 0:
        print("[SUCCESS] All skills are perfectly standardized!")
        print()
        print("Valid Skills:")
        for skill in results['valid_skills']:
            print(f"  > {skill}")
    
    print()
    print("=" * 70)
    print(f"Final Score: {percent:.2f}/100")
    if percent == 100:
        print("[PERFECT!]")
    elif percent >= 95:
        print("[Excellent!]")
    elif percent >= 85:
        print("[Good!]")
    elif percent >= 70:
        print("[Needs improvement]")
    else:
        print("[Major issues]")
    print("=" * 70)

if __name__ == "__main__":
    script_dir = Path(__file__).parent
    skills_dir = script_dir.parent / "skills"
    
    if not skills_dir.exists():
        print(f"[ERROR] Skills directory not found: {skills_dir}")
        exit(1)
    
    results = audit_skills(skills_dir)
    print_report(results)
