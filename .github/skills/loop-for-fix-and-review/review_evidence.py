"""Read-only GitHub review evidence collector. Uses Python's standard library and gh."""

import argparse
import datetime as dt
import hashlib
import json
import re
import subprocess
from pathlib import Path


COPILOT = {"copilot", "copilot-pull-request-reviewer", "copilot-pull-request-reviewer[bot]"}
UTC = dt.timezone.utc


class EvidenceError(ValueError):
    pass


def utc(value):
    # json.loads preserves GitHub timestamps as strings, independent of local timezone.
    if not isinstance(value, str) or not re.fullmatch(
        r"\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z", value
    ):
        raise EvidenceError(f"Expected raw ISO-8601 UTC timestamp, got {value!r}")
    try:
        return dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise EvidenceError(f"Invalid UTC timestamp: {value!r}") from error


def now():
    return dt.datetime.now(UTC).isoformat().replace("+00:00", "Z")


def array(value):
    if not isinstance(value, list):
        raise EvidenceError("Expected a JSON array; null/scalar is not an empty result")
    return value


def numeric_id(value):
    if type(value) is not int or value <= 0:
        raise EvidenceError(f"Expected a positive numeric database ID, got {value!r}")
    return value


def is_copilot(login):
    return isinstance(login, str) and login.casefold() in COPILOT


def candidates(reviews):
    result = []
    for review in array(reviews):
        if not is_copilot(review["user"]["login"]):
            continue
        numeric_id(review["id"])
        if review["state"] not in {"PENDING", "COMMENTED", "APPROVED", "CHANGES_REQUESTED", "DISMISSED"}:
            raise EvidenceError("Unknown Copilot review state")
        if not isinstance(review["commit_id"], str) or not review["commit_id"]:
            raise EvidenceError("Missing review commit")
        if review["state"] != "PENDING":
            utc(review["submitted_at"])
        result.append(
            {key: review[key] for key in ("id", "state", "submitted_at", "commit_id")}
            | {"login": review["user"]["login"]}
        )
    return result


def verify_request(before, after):
    for state in (before, after):
        if state["status"] != "snapshot":
            raise EvidenceError("Request verification requires successful snapshots")
    if (before["repo"], before["pr"], before["head"]) != (
        after["repo"], after["pr"], after["head"]
    ):
        raise EvidenceError("Request repository, PR or head changed")
    previous, current = before["latest_request"], after["latest_request"]
    if current is None:
        raise EvidenceError("No positive review-request event evidence")
    numeric_id(current["id"])
    timestamp = utc(current["created_at"])
    if previous is not None:
        if numeric_id(previous["id"]) >= current["id"] or utc(previous["created_at"]) > timestamp:
            raise EvidenceError("Review-request cursor did not advance")
    # GitHub events have second precision; the fresh event must fall within the request window.
    if timestamp < utc(before["started_at"]).replace(microsecond=0) or timestamp > utc(after["finished_at"]):
        raise EvidenceError("Request event is outside the captured request window")
    return {
        "status": "new-verified", "head": after["head"], "request": current,
        "requested_before": before["copilot_requested"],
        "requested_after": after["copilot_requested"],
    }


class Client:
    def __init__(self, repo, pr, output):
        self.repo, self.pr, self.output = repo, pr, output
        self.counter = 0

    def request(self, endpoint, payload=None):
        self.counter += 1
        command = ["gh", "api", endpoint, "--include", "-H", "Cache-Control: no-cache",
                   "--method", "POST" if payload is not None else "GET"]
        if payload is not None:
            command += ["--input", "-"]
        record = {"utc": now(), "endpoint": endpoint, "payload": payload}
        try:
            response = subprocess.run(
                command, input=json.dumps(payload) if payload is not None else None,
                capture_output=True, text=True, encoding="utf-8", timeout=90,
            )
        except (OSError, subprocess.TimeoutExpired) as error:
            record["error"] = str(error)
            self.save(record)
            raise EvidenceError("API execution failed; inspect request evidence") from error
        record.update(exit_code=response.returncode, raw=response.stdout, stderr=response.stderr)
        self.save(record)
        if response.returncode:
            raise EvidenceError("GitHub API failed; inspect request evidence")
        parts = re.split(r"\r?\n\r?\n", response.stdout, maxsplit=1)
        if len(parts) != 2 or not re.match(r"HTTP/\S+ 2\d\d\b", parts[0]):
            raise EvidenceError("Missing successful HTTP response headers")
        headers = {}
        for line in parts[0].splitlines()[1:]:
            name, separator, value = line.partition(":")
            if separator:
                headers[name.lower()] = value.strip()
        return json.loads(parts[1]), headers

    def save(self, record):
        (self.output / f"request-{self.counter:04}.json").write_text(
            json.dumps(record, indent=2), encoding="utf-8"
        )

    def pages(self, endpoint):
        result, page = [], 1
        while True:
            body, headers = self.request(f"{endpoint}?per_page=100&page={page}")
            entries = array(body)
            result.extend(entries)
            link = headers.get("link", "")
            if 'rel="next"' not in link:
                # An exactly full page without a Link header is ambiguous: fetch the next.
                if len(entries) == 100:
                    page += 1
                    continue
                return result
            expected = f"page={page + 1}"
            next_links = re.findall(r'<([^>]+)>;\s*rel="next"', link)
            if len(next_links) != 1 or not re.search(r"[?&]" + expected + r"(?:&|$)", next_links[0]):
                raise EvidenceError("Invalid or incomplete REST pagination")
            if not entries:
                raise EvidenceError("Empty page advertises more results")
            page += 1

    def graphql(self, query, variables):
        body, _ = self.request("graphql", {"query": query, "variables": variables})
        if not isinstance(body, dict) or body.get("errors") or not isinstance(body.get("data"), dict):
            raise EvidenceError("GraphQL error or missing data")
        return body["data"]

    def head(self):
        body, _ = self.request(f"repos/{self.repo}/pulls/{self.pr}")
        if body["state"] != "open":
            raise EvidenceError("Pull request is not open")
        head = body["head"]["sha"]
        if not isinstance(head, str) or not re.fullmatch(r"[0-9a-f]{40}", head):
            raise EvidenceError("Missing or invalid PR head SHA")
        return head

    def threads(self):
        fields = """nodes { databaseId body path line originalLine diffHunk url
          pullRequestReview { databaseId submittedAt commit { oid } author { login } } }
          pageInfo { hasNextPage endCursor }"""
        query = """query($owner:String!,$name:String!,$pr:Int!,$cursor:String) {
          repository(owner:$owner,name:$name) { pullRequest(number:$pr) {
            reviewThreads(first:100,after:$cursor) {
              nodes { id isResolved comments(first:100) { FIELDS } }
              pageInfo { hasNextPage endCursor }
            } } } }""".replace("FIELDS", fields)
        owner, name = self.repo.split("/")
        variables = {"owner": owner, "name": name, "pr": self.pr, "cursor": None}
        result, seen = [], set()
        while True:
            connection = self.graphql(query, variables)["repository"]["pullRequest"]["reviewThreads"]
            for thread in array(connection["nodes"]):
                comments, cursors = thread["comments"], set()
                thread["comments"] = list(array(comments["nodes"]))
                while self.next_cursor(comments, cursors) is not None:
                    comments = self.graphql(
                        """query($id:ID!,$cursor:String!) { node(id:$id) {
                          ... on PullRequestReviewThread { comments(first:100,after:$cursor) {
                          FIELDS } } } }""".replace("FIELDS", fields),
                        {"id": thread["id"], "cursor": comments["pageInfo"]["endCursor"]},
                    )["node"]["comments"]
                    thread["comments"].extend(array(comments["nodes"]))
                result.append(thread)
            variables["cursor"] = self.next_cursor(connection, seen)
            if variables["cursor"] is None:
                return result

    @staticmethod
    def next_cursor(connection, seen):
        info = connection["pageInfo"]
        if type(info["hasNextPage"]) is not bool:
            raise EvidenceError("Invalid GraphQL pagination state")
        if not info["hasNextPage"]:
            return None
        cursor = info["endCursor"]
        if not isinstance(cursor, str) or not cursor or cursor in seen:
            raise EvidenceError("Missing or repeated GraphQL pagination cursor")
        seen.add(cursor)
        return cursor


def unresolved(threads):
    result = []
    for thread in threads:
        if type(thread["isResolved"]) is not bool:
            raise EvidenceError("Missing thread resolution state")
        if not thread["isResolved"] and any(
            c["pullRequestReview"] and c["pullRequestReview"]["author"]
            and is_copilot(c["pullRequestReview"]["author"]["login"])
            for c in thread["comments"]
        ):
            result.append(thread["id"])
    return result


def map_comments(comments, threads, review):
    mapped = []
    for comment in array(comments):
        numeric_id(comment["id"])
        matches = [
            thread for thread in threads
            if any(c["databaseId"] == comment["id"] and c["pullRequestReview"]
                   and c["pullRequestReview"]["databaseId"] == review["id"]
                   for c in thread["comments"])
        ]
        if len(matches) != 1:
            raise EvidenceError(f"Comment {comment['id']} has no unique review/thread mapping")
        mapped.append({
            "review_id": review["id"], "review_thread_id": matches[0]["id"],
            "comment_id": comment["id"], "path": comment["path"],
            "line": comment.get("line"), "original_line": comment.get("original_line"),
            "diff_hunk": comment["diff_hunk"], "body": comment["body"],
            "url": comment["html_url"], "reviewed_head_sha": review["commit_id"],
            "submitted_at": review["submitted_at"],
        })
    return mapped


def collect(client, head, request_time, review_id=None):
    requested = utc(request_time)
    if client.head() != head:
        raise EvidenceError("PR head changed before collection")
    reviews = client.pages(f"repos/{client.repo}/pulls/{client.pr}/reviews")
    parsed = candidates(reviews)
    matches = [
        r for r in parsed if r["state"] != "PENDING" and r["commit_id"] == head
        and utc(r["submitted_at"]) >= requested
        and (review_id is None or r["id"] == review_id)
    ]
    result = {"head": head, "request_time": request_time, "candidates": parsed}
    if not matches:
        if review_id is not None:
            raise EvidenceError("Selected review does not match the active request")
        result["status"] = "pending"
    else:
        selected = max(matches, key=lambda r: (utc(r["submitted_at"]), r["id"]))
        comments = client.pages(f"repos/{client.repo}/pulls/{client.pr}/reviews/{selected['id']}/comments")
        body = next(r["body"] for r in reviews if r["id"] == selected["id"])
        generated = [
            int(count) for count in re.findall(
                r"Comments generated:\*{0,2}\s*(\d+)", body or "", re.IGNORECASE
            )
        ]
        if generated and max(generated) > len(comments):
            raise EvidenceError("Review metadata reports more comments than REST returned")
        threads = client.threads()
        result.update(
            status="comments" if comments else "no-new-comments",
            review=selected, comments=map_comments(comments, threads, selected),
            review_metadata={
                "summary": re.split(r"<details\b", body or "", maxsplit=1, flags=re.IGNORECASE)[0].strip(),
                "generated_comment_counts": generated,
                "rest_comment_count": len(comments),
            },
            unresolved_copilot_threads=unresolved(threads),
        )
        if not comments and result["unresolved_copilot_threads"]:
            raise EvidenceError("Empty review still has unresolved Copilot threads")
    if client.head() != head:
        raise EvidenceError("PR head changed during collection")
    return result


def snapshot(client):
    head = client.head()
    events = client.pages(f"repos/{client.repo}/issues/{client.pr}/events")
    requests = []
    for event in events:
        if event["event"] == "review_requested" and is_copilot(
            (event.get("requested_reviewer") or {}).get("login")
        ):
            numeric_id(event["id"])
            utc(event["created_at"])
            requests.append({"id": event["id"], "created_at": event["created_at"]})
    reviewers, _ = client.request(f"repos/{client.repo}/pulls/{client.pr}/requested_reviewers")
    reviews = candidates(client.pages(f"repos/{client.repo}/pulls/{client.pr}/reviews"))
    if client.head() != head:
        raise EvidenceError("PR head changed during snapshot")
    return {
        "status": "snapshot", "head": head,
        "latest_request": max(requests, key=lambda e: e["id"]) if requests else None,
        "copilot_requested": any(is_copilot(u["login"]) for u in array(reviewers["users"])),
        "candidates": reviews,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["snapshot", "verify-request", "collect", "threads"])
    parser.add_argument("--repo", required=True)
    parser.add_argument("--pr", required=True, type=int)
    parser.add_argument("--output", required=True, type=Path, help="New evidence directory; never reused")
    parser.add_argument("--head")
    parser.add_argument("--request-time")
    parser.add_argument("--review-id", type=int)
    parser.add_argument("--before", type=Path)
    parser.add_argument("--after", type=Path)
    args = parser.parse_args()
    if not re.fullmatch(r"[\w.-]+/[\w.-]+", args.repo) or args.pr <= 0:
        parser.error("Expected owner/repository and positive PR number")
    if args.action == "collect" and not (args.head and args.request_time):
        parser.error("collect requires --head and --request-time")
    if args.action == "verify-request" and not (args.before and args.after):
        parser.error("verify-request requires --before and --after snapshot result.json paths")
    args.output.mkdir(parents=True, exist_ok=False)
    result = {"repo": args.repo, "pr": args.pr, "started_at": now()}
    client = Client(args.repo, args.pr, args.output)
    try:
        if args.action == "snapshot":
            result.update(snapshot(client))
        elif args.action == "verify-request":
            before = json.loads(args.before.read_text(encoding="utf-8"))
            after = json.loads(args.after.read_text(encoding="utf-8"))
            if (before["repo"], before["pr"]) != (args.repo, args.pr):
                raise EvidenceError("Snapshot belongs to a different PR")
            result.update(verify_request(before, after))
            result["inputs"] = {
                str(path): hashlib.sha256(path.read_bytes()).hexdigest()
                for path in (args.before, args.after)
            }
        elif args.action == "threads":
            head = client.head()
            threads = client.threads()
            if client.head() != head:
                raise EvidenceError("PR head changed during thread collection")
            result.update(status="threads", head=head, threads=threads,
                          unresolved_copilot_threads=unresolved(threads))
        else:
            result.update(collect(client, args.head, args.request_time, args.review_id))
    except (EvidenceError, KeyError, TypeError, ValueError, OSError) as error:
        result.update(status="failed", error=f"{type(error).__name__}: {error}")
    result["finished_at"] = now()
    # Escape Unicode for redirected Windows stdout without losing the original text.
    serialized = json.dumps(result, indent=2, ensure_ascii=True)
    (args.output / "result.json").write_text(serialized, encoding="utf-8")
    print(serialized)
    return 1 if result["status"] == "failed" else 0


if __name__ == "__main__":
    raise SystemExit(main())
