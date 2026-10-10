import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="container narrow center">
      <h1 className="page-title">ページが見つかりません</h1>
      <p className="muted">URL が間違っているか、ツールが移動した可能性があります。</p>
      <p>
        <Link to="/" className="btn btn--primary">
          計算一覧へ
        </Link>
      </p>
    </div>
  );
}
