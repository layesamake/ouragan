import type { Comment } from '../payload-types'
import { formatComments, formatDateTime } from '../lib/format'
import { CommentForm } from './CommentForm'

type Props = {
  articleId: number
  comments: Pick<Comment, 'id' | 'name' | 'content' | 'createdAt'>[]
}

/** Section « Réactions » sous un article : commentaires validés + formulaire. */
export function Comments({ articleId, comments }: Props) {
  return (
    <section className="comments" id="commentaires" aria-labelledby="comments-title">
      <h2 id="comments-title">
        Réactions <span className="comments__count">({formatComments(comments.length)})</span>
      </h2>
      {comments.length === 0 ? (
        <p className="comments__empty">Soyez le premier à réagir.</p>
      ) : (
        <ol className="comments__list">
          {comments.map((c) => (
            <li key={c.id} className="comment">
              <p className="comment__head">
                <span className="comment__avatar" aria-hidden="true">
                  {c.name.trim().charAt(0).toUpperCase()}
                </span>
                <strong>{c.name}</strong>
                <time dateTime={c.createdAt}>{formatDateTime(c.createdAt)}</time>
              </p>
              <p className="comment__body">{c.content}</p>
            </li>
          ))}
        </ol>
      )}
      <CommentForm articleId={articleId} />
    </section>
  )
}
