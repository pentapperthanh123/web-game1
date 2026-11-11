#!/usr/bin/env python3
"""
Vue Performance Checker

Scans .vue files for common performance anti-patterns.
Checks 8+ patterns including v-for without key, reactive overhead, etc.
"""

import os
import re
import json
import argparse
from pathlib import Path
from typing import List, Dict, Any

class VuePerformanceChecker:
    """Vue 3 performance anti-pattern detector"""
    
    CHECKS = {
        'v_for_without_key': {
            'pattern': r'v-for\s*=\s*["\']([^"\']+)["\'](?![^<]*:key)',
            'severity': 'error',
            'message': 'v-for without :key - inefficient list rendering',
            'fix': 'Add :key="item.id" to v-for directive'
        },
        'watch_without_immediate': {
            'pattern': r'watch\s*\(\s*[^,]+\s*,\s*[^{]*\{(?![^}]*immediate)',
            'severity': 'warning',
            'message': 'watch() without immediate option - may miss initial value',
            'fix': 'Add { immediate: true } if you need initial execution'
        },
        'reactive_large_array': {
            'pattern': r'reactive\s*\(\s*\[.*?\]\s*\)',
            'severity': 'warning',
            'message': 'reactive() on array - use ref() or shallowReactive() instead',
            'fix': 'Use ref([]) for arrays or shallowReactive() for large nested objects'
        },
        'missing_use_fetch': {
            'pattern': r'\$fetch\s*\(',
            'severity': 'info',
            'message': '$fetch() instead of useFetch() - client-only, no SSR',
            'fix': 'Use useFetch() for SSR + client hydration'
        },
        'computed_side_effects': {
            'pattern': r'computed\s*\(\s*\(\s*\)\s*=>\s*\{[^}]*\.[^}]+=',
            'severity': 'error',
            'message': 'computed() with side effects - should be pure',
            'fix': 'Move side effects to watch() or watchEffect()'
        },
        'v_memo_opportunity': {
            'pattern': r'<[^>]*v-for[^>]*>[\s\S]*?expensiveComputation',
            'severity': 'info',
            'message': 'Expensive computation in v-for - consider v-memo',
            'fix': 'Add v-memo="[item.id, item.key]" to cache rendering'
        },
        'shallow_ref_needed': {
            'pattern': r'ref\s*\(\s*\{[^}]{100,}\}\s*\)',
            'severity': 'warning',
            'message': 'ref() with large object - consider shallowRef()',
            'fix': 'Use shallowRef() if you only need top-level reactivity'
        },
        'deep_watch': {
            'pattern': r'watch\s*\([^,]+\s*,\s*[^{]*\{[^}]*deep\s*:\s*true',
            'severity': 'warning',
            'message': 'watch() with deep: true - expensive for nested objects',
            'fix': 'Only use deep watch when necessary, consider watchEffect()'
        },
        'v_if_v_for_together': {
            'pattern': r'<[^>]*v-for[^>]*v-if[^>]*>|<[^>]*v-if[^>]*v-for[^>]*>',
            'severity': 'error',
            'message': 'v-if and v-for on same element - antipattern',
            'fix': 'Use computed property to filter list first'
        },
        'avoid_index_as_key': {
            'pattern': r':key\s*=\s*["\']index["\']',
            'severity': 'warning',
            'message': 'Using index as key - can cause rendering bugs',
            'fix': 'Use unique item.id as key instead'
        }
    }
    
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.issues: List[Dict[str, Any]] = []
        
    def scan_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Scan a single .vue file for issues"""
        issues = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            for check_name, check_config in self.CHECKS.items():
                pattern = check_config['pattern']
                matches = re.finditer(pattern, content, re.MULTILINE | re.DOTALL)
                
                for match in matches:
                    # Find line number
                    line_num = content[:match.start()].count('\n') + 1
                    
                    # Extract context (surrounding lines)
                    lines = content.split('\n')
                    start_line = max(0, line_num - 2)
                    end_line = min(len(lines), line_num + 2)
                    context = '\n'.join(lines[start_line:end_line])
                    
                    issues.append({
                        'file': str(file_path.relative_to(self.project_path)),
                        'line': line_num,
                        'check': check_name,
                        'severity': check_config['severity'],
                        'message': check_config['message'],
                        'fix': check_config['fix'],
                        'context': context
                    })
                    
        except Exception as e:
            print(f"Error scanning {file_path}: {e}")
            
        return issues
    
    def scan_project(self) -> List[Dict[str, Any]]:
        """Scan all .vue files in project"""
        vue_files = list(self.project_path.rglob('*.vue'))
        
        print(f"Scanning {len(vue_files)} .vue files...")
        
        for vue_file in vue_files:
            # Skip node_modules and dist
            if 'node_modules' in str(vue_file) or 'dist' in str(vue_file):
                continue
                
            issues = self.scan_file(vue_file)
            self.issues.extend(issues)
            
        return self.issues
    
    def generate_report(self, format: str = 'text') -> str:
        """Generate report in specified format"""
        if format == 'json':
            return json.dumps({
                'total_issues': len(self.issues),
                'by_severity': self._count_by_severity(),
                'issues': self.issues
            }, indent=2)
        
        # Text report
        report = []
        report.append("=" * 80)
        report.append("Vue Performance Checker Report")
        report.append("=" * 80)
        report.append(f"\nTotal issues found: {len(self.issues)}")
        report.append(f"\nBreakdown by severity:")
        
        for severity, count in self._count_by_severity().items():
            report.append(f"  {severity.upper()}: {count}")
        
        report.append("\n" + "-" * 80)
        report.append("Issues:\n")
        
        # Group by file
        by_file = {}
        for issue in self.issues:
            file = issue['file']
            if file not in by_file:
                by_file[file] = []
            by_file[file].append(issue)
        
        for file, file_issues in sorted(by_file.items()):
            report.append(f"\n📁 {file}")
            for issue in file_issues:
                severity_emoji = {
                    'error': '🔴',
                    'warning': '🟡',
                    'info': '🔵'
                }.get(issue['severity'], '⚪')
                
                report.append(f"\n  {severity_emoji} Line {issue['line']}: {issue['message']}")
                report.append(f"     Fix: {issue['fix']}")
                report.append(f"     Check: {issue['check']}")
        
        report.append("\n" + "=" * 80)
        return '\n'.join(report)
    
    def _count_by_severity(self) -> Dict[str, int]:
        """Count issues by severity"""
        counts = {'error': 0, 'warning': 0, 'info': 0}
        for issue in self.issues:
            counts[issue['severity']] += 1
        return counts

def main():
    parser = argparse.ArgumentParser(
        description='Scan Vue files for performance anti-patterns'
    )
    parser.add_argument(
        'path',
        nargs='?',
        default='.',
        help='Path to Vue project (default: current directory)'
    )
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output in JSON format'
    )
    parser.add_argument(
        '--fail-on-error',
        action='store_true',
        help='Exit with code 1 if any errors found'
    )
    
    args = parser.parse_args()
    
    checker = VuePerformanceChecker(args.path)
    issues = checker.scan_project()
    
    # Generate and print report
    format = 'json' if args.json else 'text'
    report = checker.generate_report(format)
    print(report)
    
    # Exit code
    if args.fail_on_error:
        error_count = sum(1 for issue in issues if issue['severity'] == 'error')
        if error_count > 0:
            return 1
    
    return 0

if __name__ == '__main__':
    exit(main())
