import copy
import datetime as dt
import importlib.util
import io
import json
import shutil
import subprocess
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
    def setUp(self):
        self.scratch_root = Path(__file__).with_name(".test-output")
        shutil.rmtree(self.scratch_root, ignore_errors=True)
        self.scratch_root.mkdir()

    def tearDown(self):
        shutil.rmtree(self.scratch_root, ignore_errors=True)

    def fresh_time(self):
        return dt.datetime.now(evidence.UTC).isoformat().replace("+00:00", "Z")

    def active_request(self, created_at=None):
        return {
            "status": "new-verified", "head": HEAD,
            "request": {"id": 1, "created_at": created_at or self.fresh_time()},
        }

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

    def test_positive_numbers_reject_zero_and_nonfinite_values(self):
        for value in (0, -1, float("inf"), float("-inf"), float("nan")):
            with self.subTest(value=value), self.assertRaises(evidence.EvidenceError):
                evidence.positive_number(value, "test")
        self.assertEqual(evidence.positive_number(0.001, "test"), 0.001)

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

    def test_verified_request_artifact_preserves_raw_utc_and_rejects_bad_provenance(self):
        before, after = self.snapshots()
        verified = {"repo": "owner/repo", "pr": 1} | evidence.verify_request(before, after)
        self.assertEqual(evidence.verified_request(verified, "owner/repo", 1)["request"]["created_at"], TIME)
        for corrupt in (
            verified | {"repo": "other/repo"},
            verified | {"pr": 2},
            verified | {"status": "pending"},
            verified | {"head": "not-a-sha"},
            verified | {"request": {"id": 1, "created_at": "2026-09-11T13:25:05+08:00"}},
            {"repo": "owner/repo", "pr": 1, "status": "already-pending-active",
             "head": HEAD, "request": {"id": 1, "created_at": TIME},
             "requested_before": True, "requested_after": True},
            {"repo": "owner/repo", "pr": 1, "status": "already-pending-active",
             "head": HEAD, "request": {"id": 1, "created_at": TIME},
             "requested_before": True, "requested_after": False,
             "active_pending_request": {"head": HEAD, "request": {"id": 1, "created_at": TIME}}},
        ):
            with self.subTest(corrupt=corrupt), self.assertRaises(evidence.EvidenceError):
                evidence.verified_request(corrupt, "owner/repo", 1)
        active = {
            "repo": "owner/repo", "pr": 1, "status": "already-pending-active",
            "head": HEAD, "request": {"id": 1, "created_at": TIME},
            "requested_before": True, "requested_after": True,
            "active_pending_request": {"head": HEAD, "request": {"id": 1, "created_at": TIME}},
        }
        self.assertEqual(evidence.verified_request(active, "owner/repo", 1)["status"], "already-pending-active")

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
        output = self.scratch_root / "cp1252" / "attempt"
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

    def test_collect_cli_reads_verified_request_json_directly(self):
        request_dir = self.scratch_root / "request"
        request_dir.mkdir()
        request_file = request_dir / "result.json"
        request_file.write_text(json.dumps({
            "repo": "owner/repo", "pr": 1, "status": "new-verified", "head": HEAD,
            "request": {"id": 30950876959, "created_at": TIME},
        }), encoding="utf-8")
        output = self.scratch_root / "collect-request"
        argv = ["review_evidence.py", "collect", "--repo", "owner/repo", "--pr", "1",
                "--request", str(request_file), "--output", str(output)]
        with patch("sys.argv", argv), patch("builtins.print"), patch.object(
            evidence, "Client", return_value=self.client()
        ):
            self.assertEqual(evidence.main(), 0)
        result = json.loads((output / "result.json").read_text(encoding="utf-8"))
        self.assertEqual(result["request_time"], TIME)
        request_file.write_text("{not json", encoding="utf-8")
        argv[-1] = str(self.scratch_root / "collect-corrupt")
        with patch("sys.argv", argv), patch("builtins.print"):
            self.assertEqual(evidence.main(), 1)

    def test_poll_cli_preserves_corrupt_request_artifact_failure(self):
        request_file = self.scratch_root / "corrupt-request.json"
        request_file.write_text("{not json", encoding="utf-8")
        output = self.scratch_root / "poll-corrupt"
        argv = ["review_evidence.py", "poll", "--repo", "owner/repo", "--pr", "1",
                "--request", str(request_file), "--output", str(output), "--interval-seconds", "1"]
        with patch("sys.argv", argv), patch("builtins.print"):
            self.assertEqual(evidence.main(), 1)
        result = json.loads((output / "result.json").read_text(encoding="utf-8"))
        self.assertEqual(result["status"], "failed")
        self.assertIn("Cannot read verified request artifact", result["error"])

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
            temp = self.scratch_root / f"raw-{code}-{len(raw)}"
            temp.mkdir()
            client = evidence.Client("owner/repo", 1, temp)
            with patch.object(evidence.subprocess, "run", return_value=subprocess.CompletedProcess(
                [], code, stdout=raw, stderr="error" if code else ""
            )) as run:
                with self.assertRaises((evidence.EvidenceError, json.JSONDecodeError)):
                    client.request("endpoint")
                self.assertIn("Cache-Control: no-cache", run.call_args.args[0])
            recorded = json.loads((temp / "request-0001.json").read_text())
            self.assertEqual(recorded["raw"], raw)
            self.assertEqual(recorded["exit_code"], code)

    def test_timeout_preserves_partial_stdout_stderr_losslessly(self):
        temp = self.scratch_root / "timeout"
        temp.mkdir()
        client = evidence.Client("owner/repo", 1, temp)
        timeout = subprocess.TimeoutExpired(["gh"], 3, output=b"\xffpartial", stderr=b"\x80err")
        with patch.object(evidence.subprocess, "run", side_effect=timeout):
            with self.assertRaises(evidence.EvidenceError):
                client.request("endpoint")
        recorded = json.loads((temp / "request-0001.json").read_text(encoding="utf-8"))
        self.assertTrue(recorded["timeout_expired"])
        self.assertEqual(recorded["timeout_seconds"], 3)
        self.assertEqual(recorded["stdout"]["kind"], "bytes")
        self.assertEqual(recorded["stdout"]["base64"], "/3BhcnRpYWw=")
        self.assertEqual(recorded["stderr"]["base64"], "gGVycg==")

    def test_failed_collection_writes_failure_and_never_overwrites_evidence(self):
        output = self.scratch_root / "attempt"
        argv = ["review_evidence.py", "collect", "--repo", "owner/repo", "--pr", "1",
                "--head", HEAD, "--request-time", TIME, "--output", str(output)]
        with patch("sys.argv", argv), patch.object(evidence, "collect", side_effect=KeyError("id")), patch("builtins.print"):
            self.assertEqual(evidence.main(), 1)
            original = (output / "result.json").read_bytes()
            self.assertEqual(json.loads(original)["status"], "failed")
            with self.assertRaises(FileExistsError):
                evidence.main()
            self.assertEqual((output / "result.json").read_bytes(), original)

    def test_poll_pending_to_complete_requires_final_refetch_and_distinct_dirs(self):
        output = self.scratch_root / "poll-complete"
        request = self.active_request()
        pending = {"status": "pending"}
        complete = {"status": "comments", "review": {"id": REVIEW["id"]}}
        final = {"status": "comments", "review": {"id": REVIEW["id"]}, "comments": []}
        with patch.object(evidence, "collect_once", side_effect=[pending, complete, final]) as collect_once, \
             patch.object(evidence.time, "sleep"):
            result = evidence.poll("owner/repo", 1, request, output, deadline_seconds=30, interval_seconds=1)
        self.assertEqual(result["polling"]["reliability"], "ordinary-poll-confirmed")
        directories = [call.args[2] for call in collect_once.call_args_list]
        self.assertEqual(directories, [output / "poll-0001", output / "poll-0002", output / "final-refetch"])
        self.assertEqual(len(set(directories)), 3)

    def test_poll_deadline_final_refetch_no_deadline_reset_and_pending_recovery_fails(self):
        old_start = (dt.datetime.now(evidence.UTC) - dt.timedelta(seconds=2)).isoformat().replace("+00:00", "Z")
        request = self.active_request(old_start)
        previous = self.scratch_root / "previous.json"
        previous.write_text(json.dumps({
            "repo": "owner/repo", "pr": 1, "status": "polling-checkpoint",
            "polling": {
                "status": "in-progress",
                "head": HEAD, "request": request["request"], "deadline_started_at": old_start,
                "deadline_seconds": 1, "interval_seconds": 0, "ordinary_polls": [],
            },
        }), encoding="utf-8")
        with patch.object(evidence, "collect_once", return_value={"status": "comments", "review": {"id": REVIEW["id"]}}) as collect_once:
            result = evidence.poll("owner/repo", 1, request, self.scratch_root / "poll-expired",
                                   deadline_seconds=30, interval_seconds=1, resume_from=previous)
        self.assertEqual(result["polling"]["deadline_seconds"], 1)
        self.assertTrue(result["polling"]["final_refetch_after_deadline"])
        self.assertEqual([call.args[2] for call in collect_once.call_args_list], [self.scratch_root / "poll-expired" / "final-refetch"])
        with patch.object(evidence, "collect_once", return_value={"status": "pending"}):
            with self.assertRaises(evidence.EvidenceError):
                evidence.poll("owner/repo", 1, request, self.scratch_root / "poll-pending",
                              deadline_seconds=1, interval_seconds=1)
        pending = json.loads((self.scratch_root / "poll-pending" / "result.json").read_text(encoding="utf-8"))
        self.assertEqual(pending["status"], "failed")
        self.assertIn("Final refetch did not establish", pending["error"])

    def test_resume_rejects_shifted_deadline_anchor_but_accepts_original(self):
        original_start = (
            dt.datetime.now(evidence.UTC) - dt.timedelta(seconds=10)
        ).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        request = self.active_request(original_start)
        previous = self.scratch_root / "previous-original.json"
        previous.write_text(json.dumps({
            "repo": "owner/repo", "pr": 1, "status": "polling-checkpoint",
            "polling": {
                "status": "in-progress",
                "head": HEAD, "request": request["request"], "deadline_started_at": original_start,
                "deadline_seconds": 30, "interval_seconds": 0, "ordinary_polls": [],
            },
        }), encoding="utf-8")
        self.assertEqual(
            evidence.resume_polling_state(previous, "owner/repo", 1, request)["deadline_started_at"],
            original_start,
        )
        equivalent_instant = original_start.replace("Z", ".000Z")
        self.assertEqual(evidence.utc(equivalent_instant), evidence.utc(original_start))
        for name, deadline_started_at in (
            ("previous-newer.json", self.fresh_time()),
            ("previous-equivalent-instant.json", equivalent_instant),
            (
                "previous-older.json",
                (dt.datetime.now(evidence.UTC) - dt.timedelta(seconds=20))
                .isoformat()
                .replace("+00:00", "Z"),
            ),
        ):
            shifted = self.scratch_root / name
            shifted.write_text(json.dumps({
                "repo": "owner/repo", "pr": 1, "status": "polling-checkpoint",
                "polling": {
                    "status": "in-progress",
                    "head": HEAD, "request": request["request"],
                    "deadline_started_at": deadline_started_at,
                    "deadline_seconds": 30, "interval_seconds": 0, "ordinary_polls": [],
                },
            }), encoding="utf-8")
            with self.subTest(name=name), self.assertRaises(evidence.EvidenceError):
                evidence.resume_polling_state(shifted, "owner/repo", 1, request)

    def test_resume_accepts_only_nonterminal_polling_checkpoints(self):
        request = self.active_request(TIME)
        checkpoint = self.scratch_root / "checkpoint.json"
        checkpoint.write_text(json.dumps({
            "repo": "owner/repo", "pr": 1, "status": "polling-checkpoint",
            "polling": {
                "status": "in-progress",
                "head": HEAD, "request": request["request"], "deadline_started_at": TIME,
                "deadline_seconds": 30, "interval_seconds": 0,
                "ordinary_polls": [{"directory": "poll-0001", "status": "pending"}],
            },
        }), encoding="utf-8")
        self.assertEqual(
            evidence.resume_polling_state(checkpoint, "owner/repo", 1, request)["ordinary_polls"],
            [{"directory": "poll-0001", "status": "pending"}],
        )
        for top_status, polling_status in (
            ("failed", "failed"),
            ("comments", "completed"),
            ("no-new-comments", "completed"),
            ("polling-checkpoint", "failed"),
            ("polling-checkpoint", "completed"),
        ):
            artifact = self.scratch_root / f"{top_status}-{polling_status}.json"
            artifact.write_text(json.dumps({
                "repo": "owner/repo", "pr": 1, "status": top_status,
                "polling": {
                    "status": polling_status,
                    "head": HEAD, "request": request["request"], "deadline_started_at": TIME,
                    "deadline_seconds": 30, "interval_seconds": 0, "ordinary_polls": [],
                },
            }), encoding="utf-8")
            with self.subTest(top_status=top_status, polling_status=polling_status), \
                 self.assertRaises(evidence.EvidenceError):
                evidence.resume_polling_state(artifact, "owner/repo", 1, request)

    def test_polling_checkpoint_writes_safe_nonterminal_state(self):
        output = self.scratch_root / "checkpoint-output"
        request = self.active_request(TIME)
        output.mkdir()
        evidence.polling_checkpoint(
            output, "owner/repo", 1, HEAD, request["request"], request["status"], TIME,
            TIME, 30, 1, 60, [{"directory": "poll-0001", "status": "pending"}],
        )
        checkpoint = json.loads((output / "result.json").read_text(encoding="utf-8"))
        self.assertEqual(checkpoint["status"], "polling-checkpoint")
        self.assertEqual(checkpoint["polling"]["status"], "in-progress")
        self.assertEqual(checkpoint["polling"]["deadline_started_at"], TIME)

    def test_final_refetch_timeout_uses_independent_allowance_after_ordinary_poll(self):
        output = self.scratch_root / "final-timeout"
        request = self.active_request()
        complete = {"status": "comments", "review": {"id": REVIEW["id"]}}

        with patch.object(evidence, "collect_once", side_effect=[complete, complete]) as collect_once, \
             patch.object(evidence.time, "monotonic", side_effect=[0.0, 0.0, 9.5]):
            evidence.poll("owner/repo", 1, request, output, deadline_seconds=10, interval_seconds=1)

        self.assertEqual(
            collect_once.call_args_list[1].kwargs["timeout"],
            evidence.DEFAULT_FINAL_REFETCH_SECONDS,
        )

    def test_poll_uses_last_ninety_seconds_for_ordinary_collection(self):
        output = self.scratch_root / "last-ninety"
        request = self.active_request()
        complete = {"status": "comments", "review": {"id": REVIEW["id"]}}

        with patch.object(evidence, "collect_once", side_effect=[complete, complete]) as collect_once, \
             patch.object(evidence.time, "monotonic", side_effect=[0.0, 1711.0, 1711.1]):
            evidence.poll("owner/repo", 1, request, output, deadline_seconds=1800, interval_seconds=60)

        self.assertEqual(collect_once.call_args_list[0].args[2], output / "poll-0001")
        self.assertLess(collect_once.call_args_list[0].kwargs["timeout"], evidence.DEFAULT_API_TIMEOUT_SECONDS)
        self.assertEqual(collect_once.call_args_list[1].args[2], output / "final-refetch")

    def test_poll_preserves_hung_or_error_collection_evidence(self):
        output = self.scratch_root / "poll-error"
        request = self.active_request()
        with patch.object(evidence, "collect_once", side_effect=evidence.EvidenceError("stale head")):
            with self.assertRaises(evidence.EvidenceError):
                evidence.poll("owner/repo", 1, request, output, deadline_seconds=30, interval_seconds=1)
        failed = json.loads((output / "result.json").read_text(encoding="utf-8"))
        self.assertEqual(failed["status"], "failed")
        self.assertIn("stale head", failed["error"])
        self.assertEqual(failed["polling"]["ordinary_polls"][0]["directory"], str(output / "poll-0001"))

    def test_api_timeout_is_bounded_by_poll_deadline(self):
        output = self.scratch_root / "timeout-bound"
        request = self.active_request()
        seen_timeouts = []

        def fake_collect_once(repo, pr, directory, head, request_time, review_id=None, timeout=None):
            seen_timeouts.append(timeout)
            return {"status": "pending"}

        with patch.object(evidence, "collect_once", side_effect=fake_collect_once), \
             patch.object(evidence.time, "monotonic", side_effect=[0.0, 0.0, 2.0, 2.0]), \
             patch.object(evidence.time, "sleep"):
            with self.assertRaises(evidence.EvidenceError):
                evidence.poll("owner/repo", 1, request, output, deadline_seconds=2, interval_seconds=1)
        self.assertEqual(len(seen_timeouts), 2)
        self.assertLessEqual(seen_timeouts[0], 2.0)
        self.assertEqual(seen_timeouts[1], evidence.DEFAULT_FINAL_REFETCH_SECONDS)

    def test_poll_rejects_nonpositive_or_nonfinite_intervals(self):
        request = self.active_request()
        for value in (0, -1, float("inf"), float("nan")):
            with self.subTest(value=value), self.assertRaises(evidence.EvidenceError):
                evidence.poll(
                    "owner/repo", 1, request, self.scratch_root / f"bad-interval-{value}",
                    interval_seconds=value,
                )

    def test_api_timeout_budget_is_aggregate_across_requests(self):
        temp = self.scratch_root / "aggregate-timeout"
        temp.mkdir()
        client = evidence.Client("owner/repo", 1, temp)
        client.timeout = 60
        client.deadline = 100.5
        response = subprocess.CompletedProcess([], 0, stdout="HTTP/2.0 200 OK\n\n{}", stderr="")
        with patch.object(evidence.time, "monotonic", side_effect=[100.0, 100.6]), \
             patch.object(evidence.subprocess, "run", return_value=response) as run:
            self.assertEqual(client.request("endpoint")[0], {})
            with self.assertRaises(evidence.EvidenceError):
                client.request("endpoint")
        self.assertLessEqual(run.call_args.kwargs["timeout"], 0.5)
        recorded = json.loads((temp / "request-0002.json").read_text(encoding="utf-8"))
        self.assertTrue(recorded["timeout_expired"])
        self.assertIn("aggregate timeout budget", recorded["error"])

    def test_omitted_resume_on_old_request_does_not_start_new_polling_window(self):
        output = self.scratch_root / "old-request"
        old = (dt.datetime.now(evidence.UTC) - dt.timedelta(seconds=1900)).isoformat().replace("+00:00", "Z")
        request = self.active_request(old)
        with patch.object(evidence, "collect_once", return_value={"status": "pending"}) as collect_once:
            with self.assertRaises(evidence.EvidenceError):
                evidence.poll("owner/repo", 1, request, output, deadline_seconds=1800, interval_seconds=1)
        self.assertEqual([call.args[2] for call in collect_once.call_args_list], [output / "final-refetch"])
        failed = json.loads((output / "result.json").read_text(encoding="utf-8"))
        self.assertTrue(failed["polling"]["final_refetch_directory"].endswith("final-refetch"))
        self.assertEqual(failed["polling"]["ordinary_polls"], [])

    def test_already_pending_deadline_anchors_to_original_request(self):
        old = (dt.datetime.now(evidence.UTC) - dt.timedelta(seconds=1900)).isoformat().replace("+00:00", "Z")
        active = {
            "repo": "owner/repo", "pr": 1, "status": "already-pending-active",
            "head": HEAD, "request": {"id": 1, "created_at": old},
            "requested_before": True, "requested_after": True,
            "active_pending_request": {"head": HEAD, "request": {"id": 1, "created_at": old}},
        }
        request = evidence.verified_request(active, "owner/repo", 1)
        output = self.scratch_root / "already-pending-old"
        with patch.object(evidence, "collect_once", return_value={"status": "comments", "review": {"id": REVIEW["id"]}}) as collect_once:
            result = evidence.poll("owner/repo", 1, request, output, deadline_seconds=1800, interval_seconds=1)
        self.assertTrue(result["polling"]["final_refetch_after_deadline"])
        self.assertEqual([call.args[2] for call in collect_once.call_args_list], [output / "final-refetch"])


if __name__ == "__main__":
    unittest.main()
