#!/usr/bin/env python3
"""
Seed predefined DSA questions across common topics into the database.
Can be run from the backend directory:
    python -m scripts.seed_dsa_questions
"""

import asyncio
import json
import sys
from pathlib import Path

from sqlalchemy import select

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import AsyncSessionLocal
from app.logger import get_logger
from app.models.dsa_question import DsaQuestion

logger = get_logger(__name__)

DSA_QUESTIONS = [
    {
        "problem_name": "Two Sum",
        "topic": "Arrays",
        "difficulty": "easy",
        "description": (
            "Given an array of integers and a target, return the **0-based indices** of the two numbers "
            "that add up to the target. Exactly one solution always exists.\n\n"
            "**Input Format**\n"
            "- Line 1: T — number of test cases\n"
            "- For each test case:\n"
            "  - Line 1: N — size of array\n"
            "  - Line 2: N space-separated integers\n"
            "  - Line 3: target integer\n\n"
            "**Output Format**\n"
            "One line per test case: `i j` (i < j, 0-indexed)\n\n"
            "**Constraints**\n"
            "- 1 ≤ T ≤ 100\n"
            "- 2 ≤ N ≤ 10^4\n"
            "- -10^9 ≤ nums[i], target ≤ 10^9\n\n"
            "**Examples**\n"
            "Input: N=4, nums=[2,7,11,15], target=9 → Output: `0 1`\n"
            "Input: N=3, nums=[3,2,4], target=6 → Output: `1 2`"
        ),
        "test_cases": [
            {"stdin": "2\n1 1\n2", "expected_stdout": "0 1"},
            {"stdin": "5\n-3 4 -3 5 2\n-6", "expected_stdout": "0 2"},
            {"stdin": "4\n0 4 0 5\n0", "expected_stdout": "0 2"},
            {"stdin": "3\n1000000000 -1000000000 0\n0", "expected_stdout": "0 1"},
            {"stdin": "6\n10 -20 5 -5 15 -10\n-15", "expected_stdout": "1 2"},
            {"stdin": "10\n1 2 3 4 5 6 7 8 9 10\n19", "expected_stdout": "8 9"},
            {"stdin": "7\n50 1 2 3 4 5 -30\n20", "expected_stdout": "0 6"},
            {"stdin": "5\n7 7 7 7 7\n14", "expected_stdout": "0 1"},
            {"stdin": "4\n-1000000000 1000000000 2 -2\n0", "expected_stdout": "0 1"},
            {"stdin": "2\n2147483647 -2147483647\n0", "expected_stdout": "0 1"},
        ],
        "sample_test_cases": [
            {"stdin": "4\n2 7 11 15\n9", "expected_stdout": "0 1"},
            {"stdin": "3\n3 2 4\n6", "expected_stdout": "1 2"},
            {"stdin": "5\n1 2 3 4 5\n9", "expected_stdout": "3 4"},
        ],
        "sample_solution": (
            "import sys\n\n"
            "def solve():\n"
            "    data = list(map(int, sys.stdin.read().strip().split()))\n"
            "    if not data:\n"
            "        return\n"
            "    n = data[0]\n"
            "    nums = data[1:1+n]\n"
            "    target = data[1+n]\n"
            "    seen = {}\n"
            "    for i, v in enumerate(nums):\n"
            "        need = target - v\n"
            "        if need in seen:\n"
            "            j = seen[need]\n"
            "            if j < i:\n"
            '                print(f"{j} {i}")\n'
            "            else:\n"
            '                print(f"{i} {j}")\n'
            "            return\n"
            "        seen[v] = i\n\n"
            'if __name__ == "__main__":\n'
            "    solve()"
        ),
        "time_limit_ms": 3000,
        "job_roles": json.dumps(["Software Engineer", "Backend Engineer", "Full Stack Engineer"]),
    },
    {
        "problem_name": "Maximum Subarray Sum",
        "topic": "Arrays",
        "difficulty": "medium",
        "description": (
            "Find the contiguous subarray with the largest sum (Kadane's Algorithm).\n\n"
            "**Input Format**\n"
            "- Line 1: T\n"
            "- For each test case:\n"
            "  - Line 1: N\n"
            "  - Line 2: N space-separated integers\n\n"
            "**Output Format**\n"
            "Maximum subarray sum for each test case.\n\n"
            "**Constraints**\n"
            "- 1 ≤ T ≤ 100\n"
            "- 1 ≤ N ≤ 10^5\n"
            "- -10^4 ≤ nums[i] ≤ 10^4\n\n"
            "**Examples**\n"
            "Input: [−2,1,−3,4,−1,2,1,−5,4] → Output: `6` (subarray [4,−1,2,1])\n"
            "Input: [1] → Output: `1`"
        ),
        "test_cases": [
            {"stdin": "1\n-5", "expected_stdout": "-5"},
            {"stdin": "5\n0 0 0 0 0", "expected_stdout": "0"},
            {"stdin": "6\n10000 10000 10000 10000 10000 10000", "expected_stdout": "60000"},
            {"stdin": "6\n-10000 -10000 -10000 -10000 -10000 -10000", "expected_stdout": "-10000"},
            {"stdin": "7\n2 -1 2 3 -9 2 2", "expected_stdout": "6"},
            {"stdin": "4\n-3 -2 -1 5", "expected_stdout": "5"},
            {"stdin": "10\n1 -2 3 -4 5 -6 7 -8 9 -10", "expected_stdout": "9"},
            {"stdin": "3\n-5 0 -5", "expected_stdout": "0"},
            {"stdin": "4\n10000 10000 -20000 10000", "expected_stdout": "20000"},
            {"stdin": "8\n-1 2 3 -2 5 -10 4 6", "expected_stdout": "10"},
        ],
        "sample_test_cases": [
            {"stdin": "9\n-2 1 -3 4 -1 2 1 -5 4", "expected_stdout": "6"},
            {"stdin": "1\n1", "expected_stdout": "1"},
            {"stdin": "3\n-3 -2 -1", "expected_stdout": "-1"},
        ],
        "sample_solution": (
            "import sys\n\n"
            "def main():\n"
            "    data = list(map(int, sys.stdin.read().split()))\n"
            "    n = data[0]\n"
            "    a = data[1:1+n]\n"
            "    max_ending = max_sofar = a[0]\n"
            "    for x in a[1:]:\n"
            "        max_ending = x if max_ending + x < x else max_ending + x\n"
            "        if max_ending > max_sofar:\n"
            "            max_sofar = max_ending\n"
            "    print(max_sofar)\n\n"
            'if __name__ == "__main__":\n'
            "    main()\n"
        ),
        "time_limit_ms": 5000,
        "job_roles": json.dumps(["Software Engineer", "Data Engineer", "ML Engineer"]),
    },
    {
        "problem_name": "Valid Parentheses",
        "topic": "Stacks",
        "difficulty": "easy",
        "description": "Given a string containing only `()`, `{}`, and `[]`, determine whether brackets are balanced and correctly nested.\n\n**Input Format**\nA single bracket string.\n\n**Output Format**\nPrint `true` if balanced, otherwise `false`.\n\n**Constraints**\n- 1 ≤ string length ≤ 10^4\n\n**Example**\n`([]{})` → `true`; `([)]` → `false`.",
        "test_cases": [
            {"stdin": "()", "expected_stdout": "true"},
            {"stdin": "([]{})", "expected_stdout": "true"},
            {"stdin": "([)]", "expected_stdout": "false"},
            {"stdin": "(((())))", "expected_stdout": "true"},
            {"stdin": "{[}", "expected_stdout": "false"},
            {"stdin": "]", "expected_stdout": "false"},
            {"stdin": "{}[]()", "expected_stdout": "true"},
            {"stdin": "((((", "expected_stdout": "false"},
            {"stdin": "{[()]}", "expected_stdout": "true"},
            {"stdin": "(){[}]", "expected_stdout": "false"},
        ],
        "sample_test_cases": [
            {"stdin": "([]{})", "expected_stdout": "true"},
            {"stdin": "([)]", "expected_stdout": "false"},
        ],
        "sample_solution": "import sys\ns = sys.stdin.read().strip()\npairs = {')': '(', ']': '[', '}': '{'}\nstack = []\nfor ch in s:\n    if ch in '([{':\n        stack.append(ch)\n    elif not stack or stack.pop() != pairs.get(ch):\n        print('false')\n        break\nelse:\n    print('true' if not stack else 'false')\n",
        "time_limit_ms": 3000,
        "job_roles": json.dumps(["Software Engineer", "Backend Engineer"]),
    },
    {
        "problem_name": "Binary Search",
        "topic": "Binary Search",
        "difficulty": "easy",
        "description": "Given a sorted array of distinct integers and a target, return its 0-based index, or `-1` if absent.\n\n**Input Format**\n- Line 1: N\n- Line 2: N sorted integers\n- Line 3: target\n\n**Output Format**\nPrint the index or `-1`.\n\n**Constraints**\n- 1 ≤ N ≤ 10^5\n- -10^9 ≤ nums[i], target ≤ 10^9\n\n**Example**\n`[-4, 0, 3, 9]`, target `3` → `2`.",
        "test_cases": [
            {"stdin": "4\n-4 0 3 9\n3", "expected_stdout": "2"},
            {"stdin": "5\n1 2 4 8 16\n7", "expected_stdout": "-1"},
            {"stdin": "1\n42\n42", "expected_stdout": "0"},
            {"stdin": "6\n-10 -5 0 5 10 15\n-10", "expected_stdout": "0"},
            {"stdin": "6\n-10 -5 0 5 10 15\n15", "expected_stdout": "5"},
            {"stdin": "5\n2 4 6 8 10\n1", "expected_stdout": "-1"},
            {"stdin": "5\n2 4 6 8 10\n10", "expected_stdout": "4"},
            {"stdin": "3\n-3 -1 2\n-1", "expected_stdout": "1"},
            {"stdin": "4\n100 200 300 400\n250", "expected_stdout": "-1"},
            {"stdin": "2\n-1 1\n1", "expected_stdout": "1"},
        ],
        "sample_test_cases": [
            {"stdin": "4\n-4 0 3 9\n3", "expected_stdout": "2"},
            {"stdin": "5\n1 2 4 8 16\n7", "expected_stdout": "-1"},
        ],
        "sample_solution": "import sys\ndata = list(map(int, sys.stdin.read().split()))\nn = data[0]\na = data[1:1+n]\ntarget = data[1+n]\nlo, hi = 0, n - 1\nwhile lo <= hi:\n    mid = (lo + hi) // 2\n    if a[mid] == target:\n        print(mid)\n        break\n    if a[mid] < target:\n        lo = mid + 1\n    else:\n        hi = mid - 1\nelse:\n    print(-1)\n",
        "time_limit_ms": 3000,
        "job_roles": json.dumps(["Software Engineer", "Data Engineer"]),
    },
    {
        "problem_name": "Merge Overlapping Intervals",
        "topic": "Intervals",
        "difficulty": "medium",
        "description": "Given intervals, merge all that overlap. Intervals touching at an endpoint overlap.\n\n**Input Format**\n- Line 1: N\n- Next N lines: start end\n\n**Output Format**\nPrint merged intervals as `start end`, one per line, sorted by start.\n\n**Constraints**\n- 1 ≤ N ≤ 10^5\n- -10^9 ≤ start ≤ end ≤ 10^9\n\n**Example**\n`[1,3], [2,6], [8,10]` → `1 6` then `8 10`.",
        "test_cases": [
            {"stdin": "3\n1 3\n2 6\n8 10", "expected_stdout": "1 6\n8 10"},
            {"stdin": "1\n5 5", "expected_stdout": "5 5"},
            {"stdin": "4\n1 4\n4 5\n6 8\n7 9", "expected_stdout": "1 5\n6 9"},
            {"stdin": "3\n10 12\n1 3\n5 7", "expected_stdout": "1 3\n5 7\n10 12"},
            {"stdin": "3\n1 10\n2 3\n4 8", "expected_stdout": "1 10"},
            {"stdin": "2\n-5 -1\n-3 2", "expected_stdout": "-5 2"},
            {"stdin": "4\n1 2\n3 4\n5 6\n7 8", "expected_stdout": "1 2\n3 4\n5 6\n7 8"},
            {"stdin": "3\n0 0\n0 1\n2 2", "expected_stdout": "0 1\n2 2"},
            {
                "stdin": "2\n1000000000 1000000000\n-1000000000 -999999999",
                "expected_stdout": "-1000000000 -999999999\n1000000000 1000000000",
            },
            {"stdin": "5\n1 5\n2 4\n3 3\n6 8\n8 10", "expected_stdout": "1 5\n6 10"},
        ],
        "sample_test_cases": [
            {"stdin": "3\n1 3\n2 6\n8 10", "expected_stdout": "1 6\n8 10"},
            {"stdin": "3\n10 12\n1 3\n5 7", "expected_stdout": "1 3\n5 7\n10 12"},
        ],
        "sample_solution": "import sys\ndata = list(map(int, sys.stdin.read().split()))\nn = data[0]\nintervals = sorted((data[i], data[i+1]) for i in range(1, 2*n, 2))\nmerged = []\nfor start, end in intervals:\n    if not merged or start > merged[-1][1]:\n        merged.append([start, end])\n    else:\n        merged[-1][1] = max(merged[-1][1], end)\nprint('\\n'.join(f'{a} {b}' for a, b in merged))\n",
        "time_limit_ms": 5000,
        "job_roles": json.dumps(["Software Engineer", "Backend Engineer"]),
    },
    {
        "problem_name": "Reverse a Linked List",
        "topic": "Linked Lists",
        "difficulty": "easy",
        "description": "Given the values of a singly linked list in order, reverse the list and print its values.\n\n**Input Format**\n- Line 1: N\n- Line 2: N node values\n\n**Output Format**\nPrint reversed values separated by spaces.\n\n**Constraints**\n- 1 ≤ N ≤ 10^5\n- -10^9 ≤ value ≤ 10^9\n\n**Example**\n`1 2 3 4` → `4 3 2 1`.",
        "test_cases": [
            {"stdin": "4\n1 2 3 4", "expected_stdout": "4 3 2 1"},
            {"stdin": "1\n7", "expected_stdout": "7"},
            {"stdin": "5\n-1 -2 -3 -4 -5", "expected_stdout": "-5 -4 -3 -2 -1"},
            {"stdin": "2\n0 9", "expected_stdout": "9 0"},
            {"stdin": "6\n1 1 2 3 5 8", "expected_stdout": "8 5 3 2 1 1"},
            {"stdin": "3\n1000000000 0 -1000000000", "expected_stdout": "-1000000000 0 1000000000"},
            {"stdin": "4\n4 3 2 1", "expected_stdout": "1 2 3 4"},
            {"stdin": "3\n5 5 5", "expected_stdout": "5 5 5"},
            {"stdin": "7\n2 4 6 8 10 12 14", "expected_stdout": "14 12 10 8 6 4 2"},
            {"stdin": "2\n-8 8", "expected_stdout": "8 -8"},
        ],
        "sample_test_cases": [
            {"stdin": "4\n1 2 3 4", "expected_stdout": "4 3 2 1"},
            {"stdin": "1\n7", "expected_stdout": "7"},
        ],
        "sample_solution": "import sys\ndata = list(map(int, sys.stdin.read().split()))\nn = data[0]\nprint(' '.join(map(str, reversed(data[1:1+n]))))\n",
        "time_limit_ms": 3000,
        "job_roles": json.dumps(["Software Engineer", "Backend Engineer"]),
    },
    {
        "problem_name": "Maximum Depth of a Binary Tree",
        "topic": "Trees",
        "difficulty": "easy",
        "description": "A binary tree is represented in level order, using `-1` for missing nodes. Children of index i are at 2*i+1 and 2*i+2. Find its maximum depth (nodes on the longest root-to-leaf path).\n\n**Input Format**\n- Line 1: N entries\n- Line 2: N level-order values\n\n**Output Format**\nPrint the maximum depth.\n\n**Constraints**\n- 1 ≤ N ≤ 10^5\n- `-1` means a missing node; other values are node values\n\n**Example**\n`[3, 9, 20, -1, -1, 15, 7]` → `3`.",
        "test_cases": [
            {"stdin": "7\n3 9 20 -1 -1 15 7", "expected_stdout": "3"},
            {"stdin": "1\n5", "expected_stdout": "1"},
            {"stdin": "3\n1 2 3", "expected_stdout": "2"},
            {"stdin": "7\n1 2 -1 3 -1 -1 -1", "expected_stdout": "3"},
            {"stdin": "7\n1 -1 2 -1 -1 -1 3", "expected_stdout": "3"},
            {"stdin": "7\n1 2 3 4 5 6 7", "expected_stdout": "3"},
            {"stdin": "4\n10 20 -1 -1", "expected_stdout": "2"},
            {"stdin": "3\n-10 -1 -1", "expected_stdout": "1"},
            {"stdin": "9\n1 2 3 4 -1 -1 -1 5 -1", "expected_stdout": "4"},
            {"stdin": "2\n1 -1", "expected_stdout": "1"},
        ],
        "sample_test_cases": [
            {"stdin": "7\n3 9 20 -1 -1 15 7", "expected_stdout": "3"},
            {"stdin": "1\n5", "expected_stdout": "1"},
        ],
        "sample_solution": "import sys\ndef depth(a, i=0):\n    if i >= len(a) or a[i] == -1:\n        return 0\n    return 1 + max(depth(a, 2*i+1), depth(a, 2*i+2))\ndata = list(map(int, sys.stdin.read().split()))\nprint(depth(data[1:1+data[0]]))\n",
        "time_limit_ms": 5000,
        "job_roles": json.dumps(["Software Engineer", "Backend Engineer"]),
    },
    {
        "problem_name": "Count Connected Components",
        "topic": "Graphs",
        "difficulty": "medium",
        "description": "Given an undirected graph, count its connected components. Vertices are numbered 0 through N-1.\n\n**Input Format**\n- Line 1: N M\n- Next M lines: edge endpoint indices\n\n**Output Format**\nPrint the number of connected components.\n\n**Constraints**\n- 1 ≤ N ≤ 10^5\n- 0 ≤ M ≤ 2×10^5\n- No self-loops or duplicate edges\n\n**Example**\nFor 5 vertices and edges `(0,1)`, `(1,2)`, `(3,4)`, output `2`.",
        "test_cases": [
            {"stdin": "5 3\n0 1\n1 2\n3 4", "expected_stdout": "2"},
            {"stdin": "1 0", "expected_stdout": "1"},
            {"stdin": "4 0", "expected_stdout": "4"},
            {"stdin": "4 3\n0 1\n1 2\n2 3", "expected_stdout": "1"},
            {"stdin": "6 3\n0 1\n2 3\n4 5", "expected_stdout": "3"},
            {"stdin": "5 4\n0 1\n0 2\n0 3\n0 4", "expected_stdout": "1"},
            {"stdin": "7 4\n0 1\n1 2\n4 5\n5 6", "expected_stdout": "3"},
            {"stdin": "3 2\n0 1\n1 2", "expected_stdout": "1"},
            {"stdin": "5 2\n0 1\n3 4", "expected_stdout": "3"},
            {"stdin": "2 1\n0 1", "expected_stdout": "1"},
        ],
        "sample_test_cases": [
            {"stdin": "5 3\n0 1\n1 2\n3 4", "expected_stdout": "2"},
            {"stdin": "4 0", "expected_stdout": "4"},
        ],
        "sample_solution": "import sys\ndata = list(map(int, sys.stdin.read().split()))\nn, m = data[0], data[1]\ngraph = [[] for _ in range(n)]\np = 2\nfor _ in range(m):\n    u, v = data[p], data[p+1]\n    p += 2\n    graph[u].append(v)\n    graph[v].append(u)\nseen = set()\ncount = 0\nfor start in range(n):\n    if start not in seen:\n        count += 1\n        stack = [start]\n        seen.add(start)\n        while stack:\n            for v in graph[stack.pop()]:\n                if v not in seen:\n                    seen.add(v)\n                    stack.append(v)\nprint(count)\n",
        "time_limit_ms": 5000,
        "job_roles": json.dumps(["Software Engineer", "Backend Engineer"]),
    },
    {
        "problem_name": "Minimum Coin Change",
        "topic": "Dynamic Programming",
        "difficulty": "medium",
        "description": "Given coin denominations and a target amount, return the minimum number of coins needed. Each denomination may be used repeatedly. Print `-1` if impossible.\n\n**Input Format**\n- Line 1: N denominations\n- Line 2: N positive coin values\n- Line 3: amount\n\n**Output Format**\nPrint the minimum count, or `-1` if no combination exists.\n\n**Constraints**\n- 1 ≤ N ≤ 100\n- 1 ≤ coin value ≤ 10^4\n- 0 ≤ amount ≤ 10^4\n\n**Example**\nCoins `[1, 2, 5]`, amount `11` → `3`.",
        "test_cases": [
            {"stdin": "3\n1 2 5\n11", "expected_stdout": "3"},
            {"stdin": "1\n2\n3", "expected_stdout": "-1"},
            {"stdin": "1\n7\n0", "expected_stdout": "0"},
            {"stdin": "4\n1 3 4 5\n7", "expected_stdout": "2"},
            {"stdin": "3\n2 5 10\n6", "expected_stdout": "3"},
            {"stdin": "2\n2 3\n1", "expected_stdout": "-1"},
            {"stdin": "4\n1 5 10 25\n30", "expected_stdout": "2"},
            {"stdin": "2\n3 4\n6", "expected_stdout": "2"},
            {"stdin": "3\n2 4 6\n8", "expected_stdout": "2"},
            {"stdin": "5\n1 7 10 15 20\n29", "expected_stdout": "3"},
        ],
        "sample_test_cases": [
            {"stdin": "3\n1 2 5\n11", "expected_stdout": "3"},
            {"stdin": "1\n2\n3", "expected_stdout": "-1"},
        ],
        "sample_solution": "import sys\ndata = list(map(int, sys.stdin.read().split()))\nn = data[0]\ncoins = data[1:1+n]\namount = data[1+n]\ninf = amount + 1\ndp = [0] + [inf] * amount\nfor value in range(1, amount+1):\n    for coin in coins:\n        if coin <= value:\n            dp[value] = min(dp[value], dp[value-coin] + 1)\nprint(dp[amount] if dp[amount] != inf else -1)\n",
        "time_limit_ms": 5000,
        "job_roles": json.dumps(["Software Engineer", "ML Engineer"]),
    },
    {
        "problem_name": "Maximum Non-Overlapping Activities",
        "topic": "Greedy",
        "difficulty": "medium",
        "description": "Given activities with start and end times, select the largest possible number without overlap. An activity ending at t may be followed by one starting at t.\n\n**Input Format**\n- Line 1: N\n- Next N lines: start end\n\n**Output Format**\nPrint the maximum number of selected activities.\n\n**Constraints**\n- 1 ≤ N ≤ 10^5\n- 0 ≤ start < end ≤ 10^9\n\n**Example**\nActivities `(1,3), (2,4), (3,5)` → `2`.",
        "test_cases": [
            {"stdin": "3\n1 3\n2 4\n3 5", "expected_stdout": "2"},
            {"stdin": "1\n0 1", "expected_stdout": "1"},
            {"stdin": "4\n1 2\n2 3\n3 4\n4 5", "expected_stdout": "4"},
            {"stdin": "4\n1 10\n2 3\n3 4\n4 5", "expected_stdout": "3"},
            {"stdin": "3\n5 8\n1 3\n3 5", "expected_stdout": "2"},
            {"stdin": "5\n1 4\n2 3\n3 5\n4 6\n6 8", "expected_stdout": "3"},
            {"stdin": "3\n0 2\n2 4\n4 6", "expected_stdout": "3"},
            {"stdin": "4\n1 5\n2 6\n3 7\n4 8", "expected_stdout": "1"},
            {"stdin": "5\n10 20\n1 2\n2 3\n3 4\n4 5", "expected_stdout": "4"},
            {"stdin": "2\n100000000 100000001\n100000001 100000002", "expected_stdout": "2"},
        ],
        "sample_test_cases": [
            {"stdin": "3\n1 3\n2 4\n3 5", "expected_stdout": "2"},
            {"stdin": "4\n1 2\n2 3\n3 4\n4 5", "expected_stdout": "4"},
        ],
        "sample_solution": "import sys\ndata = list(map(int, sys.stdin.read().split()))\nn = data[0]\nactivities = [(data[i], data[i+1]) for i in range(1, 2*n, 2)]\nactivities.sort(key=lambda x: x[1])\ncount, last_end = 0, None\nfor start, end in activities:\n    if last_end is None or start >= last_end:\n        count += 1\n        last_end = end\nprint(count)\n",
        "time_limit_ms": 5000,
        "job_roles": json.dumps(["Software Engineer", "Project Engineer"]),
    },
]


async def seed_questions() -> None:
    async with AsyncSessionLocal() as session:
        for q_data in DSA_QUESTIONS:
            result = await session.execute(
                select(DsaQuestion).where(
                    DsaQuestion.problem_name == q_data["problem_name"],
                    DsaQuestion.topic == q_data["topic"],
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                print(
                    f"Skipping already existing question: {q_data['problem_name']} ({q_data['difficulty']})"
                )
                continue

            question = DsaQuestion(**q_data)
            session.add(question)
            await session.commit()
            print(f"Seeded: {q_data['problem_name']} [{q_data['topic']} / {q_data['difficulty']}]")


if __name__ == "__main__":
    asyncio.run(seed_questions())
