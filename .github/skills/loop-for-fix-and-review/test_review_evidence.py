import copy
import datetime as dt
import importlib.util
import io
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch


SPEC = importlib.util.spec_from_file_location(
    "review_evidence", Path(__file__).with_name("review_evidence.py")
)
evidence = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(evidence)

HEAD = "a" * 40
TIME = "2026-09-11T05:25:05Z"
REVIEW = {
    "id": 5175267376, "user": {"login": "copilot-pull-request-reviewer[bot]"},
    "state": "COMMENTED", "submitted_at": "2026-09-11T05:31:08Z",
    "commit_id": HEAD, "body": "**Comments generated:** 1",
}
COMMENT = {
    "id": 3986202878, "path": "rule.ts", "line": None, "original_line": None,
    "diff_hunk": "@@ example", "body": "Finding", "html_url": "https://example.test/comment",
}
THREAD = {
    "id": "thread", "isResolved": False,
    "comments": [{
        "databaseId": COMMENT["id"],
        "pullRequestReview": {"databaseId": REVIEW["id"], "author": {"login": "Copilot"}},
    }],
}


class EvidenceTests(unittest.TestCase):
    def test_utc_comparison_does_not_depend_on_local_timezone(self):
        self.assertGreater(evidence.utc(REVIEW["submitted_at"]), evidence.utc(TIME))
        plus_eight = dt.timezone(dt.timedelta(hours=8))
        self.assertEqual(
            evidence.utc(TIME),
            dt.datetime(2026, 9, 11, 13, 25, 5, tzinfo=plus_eight),
        )
        for invalid in ("09/11/2026 05:25:05", "2026-09-11T05:25:05",
                        "2026-09-11T13:25:05+08:00", "2026-99-11T05:25:05Z",
                        dt.datetime(2026, 9, 11, 5, 25, 5), None):
            with self.subTest(value=invalid), self.assertRaises(evidence.EvidenceError):
                evidence.utc(invalid)

    def test_arrays_never_collapse_zero_one_many(self):
        for count in (0, 1, 3):
            self.assertEqual(len(evidence.candidates([REVIEW] * count)), count)
        for invalid in (None, REVIEW, "[]"):
            with self.assertRaises(evidence.EvidenceError):
                evidence.candidates(invalid)

    def test_all_copilot_aliases_and_no_lookalikes(self):
        for login in evidence.COPILOT:
            self.assertTrue(evidence.is_copilot(login.upper()))
        for login in ("copilot-other", "copilot[bot]", " Copilot", "", None):
            self.assertFalse(evidence.is_copilot(login))

    def test_invalid_candidate_fields_fail_closed(self):
        for key, value in (("id", "12"), ("id", True), ("commit_id", None),
                           ("state", "UNKNOWN"), ("submitted_at", None)):
            with self.subTest(key=key), self.assertRaises(evidence.EvidenceError):
                evidence.candidates([REVIEW | {key: value}])
        missing = dict(REVIEW)
        del missing["submitted_at"]
        with self.assertRaises(KeyError):
            evidence.candidates([missing])
        pending = REVIEW | {"state": "PENDING", "submitted_at": None}
        self.assertEqual(evidence.candidates([pending])[0]["state"], "PENDING")

    def snapshots(self):
        before = {
            "repo": "owner/repo", "pr": 1, "status": "snapshot", "head": HEAD,
            "started_at": "2026-09-11T05:24:58Z", "finished_at": "2026-09-11T05:25:02Z",
            "latest_request": None, "copilot_requested": False,
        }
        after = before | {
            "finished_at": "2026-09-11T05:25:12Z",
            "latest_request": {"id": 30950876959, "created_at": TIME},
        }
        return before, after

    def test_request_verified_by_event_not_requested_reviewer_presence(self):
        before, after = self.snapshots()
        self.assertEqual(evidence.verify_request(before, after)["status"], "new-verified")

    def test_request_rejects_stale_or_missing_evidence(self):
        before, after = self.snapshots()
        for changed in (
            after | {"head": "b" * 40}, after | {"pr": 2},
            after | {"latest_request": None},
            after | {"status": "failed"},
            after | {"latest_request": {"id": 2, "created_at": "2026-09-10T05:25:05Z"}},
        ):
            with self.subTest(changed=changed), self.assertRaises(evidence.EvidenceError):
                evidence.verify_request(before, changed)
        with self.assertRaises(evidence.EvidenceError):
            evidence.verify_request(before | {"latest_request": after["latest_request"]}, after)

    def client(self, reviews=None, comments=None, threads=None):
        client = Mock()
        client.repo, client.pr = "owner/repo", 1
        client.head.return_value = HEAD
        client.pages.side_effect = [
            [REVIEW] if reviews is None else reviews,
            [COMMENT] if comments is None else comments,
        ]
        client.threads.return_value = [THREAD] if threads is None else threads
        return client

    def test_collect_completed_commented_review_with_nullable_positions(self):
        result = evidence.collect(self.client(), HEAD, TIME, REVIEW["id"])
        self.assertEqual(result["status"], "comments")
        self.assertIsNone(result["comments"][0]["line"])
        self.assertIsNone(result["comments"][0]["original_line"])
        self.assertEqual(result["unresolved_copilot_threads"], ["thread"])

    def test_empty_review_is_clean_only_without_unresolved_threads(self):
        review = REVIEW | {"body": "**Comments generated:** 0"}
        result = evidence.collect(self.client([review], [], []), HEAD, TIME)
        self.assertEqual(result["status"], "no-new-comments")
        with self.assertRaises(evidence.EvidenceError):
            evidence.collect(self.client([review], []), HEAD, TIME)
        with self.assertRaises(evidence.EvidenceError):
            evidence.collect(self.client(comments=[]), HEAD, TIME)

    def test_metadata_preserves_unicode_summary_without_details(self):
        summary = "### \U0001f7e1 Changes recommended\n\nGenerated 1 comment."
        review = REVIEW | {
            "body": summary + "\n\n<DETAILS><summary>Review details</summary>\n"
            "**Comments generated:** 1\nSuppressed finding\n</DETAILS>",
        }
        result = evidence.collect(self.client([review]), HEAD, TIME)
        self.assertEqual(result["review_metadata"], {
            "summary": summary, "generated_comment_counts": [1], "rest_comment_count": 1,
        })

    def test_missing_count_marker_is_not_a_zero_comment_declaration(self):
        for body in ("Generated one comment.", "", None):
            with self.subTest(body=body):
                result = evidence.collect(self.client([REVIEW | {"body": body}]), HEAD, TIME)
                self.assertEqual(result["review_metadata"], {
                    "summary": body or "", "generated_comment_counts": [], "rest_comment_count": 1,
                })

    def test_metadata_checks_all_generated_count_markers(self):
        review = REVIEW | {"body": "**Comments generated:** 0\n**Comments generated:** 2"}
        with self.assertRaises(evidence.EvidenceError):
            evidence.collect(self.client([review]), HEAD, TIME)

    def test_clean_review_summary_excludes_suppressed_details(self):
        review = REVIEW | {
            "body": "No new comments.\n<details>\n**Comments generated:** 0\n"
            "Suppressed finding\n</details>",
        }
        result = evidence.collect(self.client([review], [], []), HEAD, TIME)
        self.assertEqual(result["status"], "no-new-comments")
        self.assertEqual(result["review_metadata"], {
            "summary": "No new comments.", "generated_comment_counts": [0], "rest_comment_count": 0,
        })

    def test_cli_metadata_and_comments_round_trip_through_cp1252_stdout(self):
        review = REVIEW | {"body": "### \U0001f7e1 Changes recommended\n**Comments generated:** 1"}
        comment = COMMENT | {"body": "Check \U0001f7e1 and \u4e2d\u6587"}
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "attempt"
            argv = ["review_evidence.py", "collect", "--repo", "owner/repo", "--pr", "1",
                    "--head", HEAD, "--request-time", TIME, "--output", str(output)]
            with io.TextIOWrapper(io.BytesIO(), encoding="cp1252", errors="strict") as stdout:
                with patch("sys.argv", argv), patch("sys.stdout", stdout), patch.object(
                    evidence, "Client", return_value=self.client([review], [comment])
                ):
                    self.assertEqual(evidence.main(), 0)
                stdout.flush()
                rendered = stdout.buffer.getvalue().decode("cp1252")
            result = json.loads(rendered)
            self.assertTrue(rendered.isascii())
            self.assertEqual(result, json.loads((output / "result.json").read_text(encoding="utf-8")))
            self.assertEqual(result["review_metadata"]["summary"], review["body"])
            self.assertEqual(result["comments"][0]["body"], comment["body"])

    def test_pending_and_wrong_review_never_become_clean(self):
        for review in (REVIEW | {"commit_id": "b" * 40},
                       REVIEW | {"submitted_at": "2026-09-11T05:24:00Z"}):
            self.assertEqual(evidence.collect(self.client([review]), HEAD, TIME)["status"], "pending")
            with self.assertRaises(evidence.EvidenceError):
                evidence.collect(self.client([review]), HEAD, TIME, REVIEW["id"])
        self.assertEqual(evidence.collect(self.client([]), HEAD, TIME)["status"], "pending")

    def test_head_changes_before_or_during_collection_fail(self):
        for values in (["b" * 40], [HEAD, "b" * 40]):
            client = self.client()
            client.head.side_effect = values
            with self.assertRaises(evidence.EvidenceError):
                evidence.collect(client, HEAD, TIME)

    def test_unmapped_or_wrong_review_comment_fails(self):
        for threads in ([], [THREAD, THREAD]):
            with self.assertRaises(evidence.EvidenceError):
                evidence.map_comments([COMMENT], threads, REVIEW)
        wrong = copy.deepcopy(THREAD)
        wrong["comments"][0]["pullRequestReview"]["databaseId"] = 1
        with self.assertRaises(evidence.EvidenceError):
            evidence.map_comments([COMMENT], [wrong], REVIEW)

    def test_rest_pagination_and_failure_are_not_partial_success(self):
        client = evidence.Client("owner/repo", 1, Path("."))
        client.request = Mock(side_effect=[
            ([1], {"link": '<https://api.github.com/x?per_page=100&page=2>; rel="next"'}),
            ([2], {}),
        ])
        self.assertEqual(client.pages("x"), [1, 2])
        client.request.side_effect = [([1], {"link": '<https://api.github.com/x?page=2>; rel="next"'}),
                                      evidence.EvidenceError("HTTP 500")]
        with self.assertRaises(evidence.EvidenceError):
            client.pages("x")
        for response in ((None, {}), ([], {"link": '<x?page=2>; rel="next"'}),
                         ([1], {"link": '<x?page=1>; rel="next"'})):
            client.request.side_effect = [response]
            with self.assertRaises(evidence.EvidenceError):
                client.pages("x")

    def test_full_rest_page_without_link_probes_next_page(self):
        client = evidence.Client("owner/repo", 1, Path("."))
        client.request = Mock(side_effect=[(list(range(100)), {}), ([], {})])
        self.assertEqual(len(client.pages("x")), 100)
        self.assertEqual(client.request.call_count, 2)

    def test_graphql_missing_repeated_or_invalid_cursor_fails(self):
        for info in ({"hasNextPage": True, "endCursor": None},
                     {"hasNextPage": True, "endCursor": "old"},
                     {"hasNextPage": None, "endCursor": None}):
            with self.assertRaises(evidence.EvidenceError):
                evidence.Client.next_cursor({"pageInfo": info}, {"old"})

    def test_invalid_graphql_payload_or_head_fails(self):
        client = evidence.Client("owner/repo", 1, Path("."))
        for body in ([], {"errors": ["failure"]}, {"data": None}):
            client.request = Mock(return_value=(body, {}))
            with self.assertRaises(evidence.EvidenceError):
                client.graphql("query", {})
        for head in (None, "", "not-a-sha"):
            client.request = Mock(return_value=({"state": "open", "head": {"sha": head}}, {}))
            with self.assertRaises(evidence.EvidenceError):
                client.head()

    def test_graphql_paginates_threads_and_nested_comments(self):
        def connection(nodes, cursor=None):
            return {"nodes": nodes, "pageInfo": {"hasNextPage": cursor is not None, "endCursor": cursor}}
        client = evidence.Client("owner/repo", 1, Path("."))
        client.graphql = Mock(side_effect=[
            {"repository": {"pullRequest": {"reviewThreads": connection([
                {"id": "thread", "isResolved": False, "comments": connection([{"databaseId": 1}], "c1")}
            ], "t1")}}},
            {"node": {"comments": connection([{"databaseId": 2}])}},
            {"repository": {"pullRequest": {"reviewThreads": connection([])}}},
        ])
        threads = client.threads()
        self.assertEqual([c["databaseId"] for c in threads[0]["comments"]], [1, 2])
        self.assertEqual(client.graphql.call_count, 3)

    def test_raw_http_failures_and_parse_failures_are_preserved(self):
        for code, raw in ((1, "HTTP/2.0 403 Forbidden\n\n{}"),
                          (0, "HTTP/2.0 200 OK\nX-RateLimit-Remaining: 10\n\nnot json")):
            with tempfile.TemporaryDirectory() as temp:
                client = evidence.Client("owner/repo", 1, Path(temp))
                with patch.object(evidence.subprocess, "run", return_value=subprocess.CompletedProcess(
                    [], code, stdout=raw, stderr="error" if code else ""
                )) as run:
                    with self.assertRaises((evidence.EvidenceError, json.JSONDecodeError)):
                        client.request("endpoint")
                    self.assertIn("Cache-Control: no-cache", run.call_args.args[0])
                recorded = json.loads((Path(temp) / "request-0001.json").read_text())
                self.assertEqual(recorded["raw"], raw)
                self.assertEqual(recorded["exit_code"], code)

    def test_failed_collection_writes_failure_and_never_overwrites_evidence(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "attempt"
            argv = ["review_evidence.py", "collect", "--repo", "owner/repo", "--pr", "1",
                    "--head", HEAD, "--request-time", TIME, "--output", str(output)]
            with patch("sys.argv", argv), patch.object(evidence, "collect", side_effect=KeyError("id")), patch("builtins.print"):
                self.assertEqual(evidence.main(), 1)
                original = (output / "result.json").read_bytes()
                self.assertEqual(json.loads(original)["status"], "failed")
                with self.assertRaises(FileExistsError):
                    evidence.main()
                self.assertEqual((output / "result.json").read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
