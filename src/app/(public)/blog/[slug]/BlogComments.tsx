"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import styles from "./blog-detail.module.css";

interface CommentRow {
  id: string;
  parentId: string | null;
  body: string;
  likeCount: number;
  createdAt: string;
  firstName: string;
  lastName: string | null;
}

export function BlogComments({ slug }: { slug: string }) {
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    const json = await fetch(`/api/blog/${slug}/comments`).then((res) => res.json());
    if (json.success) setComments(json.data);
  }

  useEffect(() => { load().catch(() => {}); }, [slug]);

  const tree = useMemo(() => {
    const byParent = new Map<string, CommentRow[]>();
    for (const comment of comments) {
      const key = comment.parentId || "root";
      byParent.set(key, [...(byParent.get(key) ?? []), comment]);
    }
    return byParent;
  }, [comments]);

  async function submit() {
    const json = await fetch(`/api/blog/${slug}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, parentId: replyTo }),
    }).then((res) => res.json());
    if (json.success) {
      setBody("");
      setReplyTo(null);
      setMessage(json.message ?? "Comment submitted for approval");
      return;
    }
    if (json.error?.toLowerCase().includes("authentication")) setLoginOpen(true);
    else setMessage(json.error ?? "Comment failed");
  }

  async function like(id: string) {
    const json = await fetch(`/api/blog/comments/${id}/like`, { method: "POST" }).then((res) => res.json());
    if (json.success) {
      setComments((rows) => rows.map((row) => row.id === id ? { ...row, likeCount: json.data.likeCount } : row));
      return;
    }
    if (json.error?.toLowerCase().includes("authentication")) setLoginOpen(true);
  }

  return (
    <section className={styles.comments}>
      <h2>Comments</h2>
      <div className={styles.commentForm}>
        {replyTo && <p className={styles.replying}>Replying to a comment <button type="button" onClick={() => setReplyTo(null)}>Cancel</button></p>}
        <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Share your thoughts" />
        <Button type="button" variant="primary" onClick={submit} disabled={!body.trim()}>Submit Comment</Button>
        {message && <p className={styles.commentNotice}>{message}</p>}
      </div>
      <div className={styles.commentList}>
        {(tree.get("root") ?? []).map((comment) => (
          <CommentItem key={comment.id} comment={comment} childrenByParent={tree} onReply={setReplyTo} onLike={like} />
        ))}
      </div>
      <Modal isOpen={loginOpen} onClose={() => setLoginOpen(false)} title="Login required" maxWidth="420px">
        <div className={styles.loginPrompt}>
          <p>Only members can comment, reply, or like comments.</p>
          <Link href={`/login?redirect=/blog/${slug}`} className={styles.loginLink}>Login to continue</Link>
        </div>
      </Modal>
    </section>
  );
}

function CommentItem({
  comment,
  childrenByParent,
  onReply,
  onLike,
}: {
  comment: CommentRow;
  childrenByParent: Map<string, CommentRow[]>;
  onReply: (id: string) => void;
  onLike: (id: string) => void;
}) {
  const replies = childrenByParent.get(comment.id) ?? [];
  return (
    <article className={styles.commentItem}>
      <p className={styles.commentAuthor}>{comment.firstName} {comment.lastName ?? ""}</p>
      <p>{comment.body}</p>
      <div className={styles.commentActions}>
        <button type="button" onClick={() => onLike(comment.id)}>Like ({comment.likeCount})</button>
        <button type="button" onClick={() => onReply(comment.id)}>Reply</button>
        <span>{new Date(comment.createdAt).toLocaleDateString("en-IN")}</span>
      </div>
      {replies.length > 0 && (
        <div className={styles.commentReplies}>
          {replies.map((reply) => <CommentItem key={reply.id} comment={reply} childrenByParent={childrenByParent} onReply={onReply} onLike={onLike} />)}
        </div>
      )}
    </article>
  );
}
