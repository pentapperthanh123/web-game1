#!/usr/bin/env python3
"""
Svelte Performance Checker

Scans .svelte files for common performance anti-patterns.
Checks 8+ patterns including each without key, event modifiers, etc.
"""

import os
import re
import json
import argparse
from pathlib import Path
from typing import List, Dict, Any

class SveltePerformanceChecker:
    """Svelte performance anti-pattern detector"""
    
    CHECKS = {
        'each_without_key': {
            'pattern': r'\{#each\s+[^}]+\sas\s+[^(}]+(?!\([^)]*\))\}',
            'severity': 'error',
            'message': '{#each} without key - inefficient list reconciliation',
            'fix': 'Add key: {#each items as item (item.id)}'
        },
        'missing_event_modifiers': {
            'pattern': r'on:(submit|scroll|wheel|touchstart|touchmove)=\{[^}]+\}(?![^>]*\|)',
            'severity': 'warning',
            'message': 'Event without modifiers - consider preventDefault, passive',
            'fix': 'Use on:submit|preventDefault or on:scroll|passive'
        },
        'reactive_statement_heavy': {
            'pattern': r'\$:\s*\{[^}]{200,}\}',
            'severity': 'info',
            'message': 'Heavy reactive statement - may run too frequently',
            'fix': 'Break into smaller reactive statements or use derived stores'
        },
        'load_function_waterfalls': {
            'pattern': r'export\s+async\s+function\s+load[^{]*\{[^}]*await[^}]*await',
            'severity': 'warning',
            'message': 'Sequential awaits in load function - waterfall',
            'fix': 'Use Promise.all() for parallel loading'
        },
        'store_subscription_leak': {
            'pattern': r'\.subscribe\s*\([^)]+\)(?![^;]*unsubscribe)',
            'severity': 'warning',
            'message': 'Store subscription without cleanup - memory leak',
            'fix': 'Use $store syntax or call onDestroy(unsubscribe)'
        },
        'improper_bind_usage': {
            'pattern': r'bind:value=\{[^}]+\}[^>]*on:input',
            'severity': 'info',
            'message': 'bind:value with on:input - redundant',
            'fix': 'bind:value handles input automatically'
        },
        'transition_overhead': {
            'pattern': r'transition:[a-z]+(?![^>]*\|local)',
            'severity': 'info',
            'message': 'Global transition - may animate unnecessarily',
            'fix': 'Use transition:fade|local for component-specific animations'
        },
        'context_overuse': {
            'pattern': r'setContext\s*\(\s*["\'][^"\']+["\'],\s*\{[^}]{100,}\}',
            'severity': 'info',
            'message': 'Large object in setContext - consider splitting',
            'fix': 'Break into smaller context values'
        },
        'no_ssr_false': {
            'pattern': r'export\s+const\s+ssr\s*=\s*false',
            'severity': 'warning',
            'message': 'ssr = false - page only renders on client',
            'fix': 'Use SSR unless you have a specific reason not to'
        },
        'prerender_missing': {
            'pattern': r'export\s+const\s+prerender',
            'severity': 'info',
            'message': 'Consider prerender = true for static content',
            'fix': 'Add export const prerender = true if content is static'
        },
        'missing_page_server': {
            'pattern': r'\+page\.ts',
            'severity': 'info',
            'message': 'Using +page.ts instead of +page.server.ts',
            'fix': 'Use +page.server.ts for server-only data (secrets, database)'
        },
        'unkeyed_await': {
            'pattern': r'\{#await\s+[^}]+\}(?![^{]*then[^{]*catch)',
            'severity': 'warning',
            'message': '{#await} without {catch} block - unhandled errors',
            'fix': 'Add {:catch error} block to handle failures'
        }
    }
    
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.issues: List[Dict[str, Any]] = []
        
    def scan_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Scan a single .svelte file for issues"""
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
        """Scan all .svelte files in project"""
        svelte_files = list(self.project_path.rglob('*.svelte'))
        
        # Also check +page.ts and +page.server.ts files
        page_files = list(self.project_path.rglob('+page*.ts'))
        
        all_files = svelte_files + page_files
        
        print(f"Scanning {len(all_files)} Svelte/SvelteKit files...")
        
        for file in all_files:
            # Skip node_modules and .svelte-kit
            if 'node_modules' in str(file) or '.svelte-kit' in str(file):
                continue
                
            issues = self.scan_file(file)
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
        report.append("Svelte Performance Checker Report")
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
        description='Scan Svelte files for performance anti-patterns'
    )
    parser.add_argument(
        'path',
        nargs='?',
        default='.',
        help='Path to Svelte project (default: current directory)'
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
    
    checker = SveltePerformanceChecker(args.path)
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
