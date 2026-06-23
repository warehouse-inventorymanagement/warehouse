import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="text-center">
        <p className="text-8xl font-bold mb-4" style={{ color: 'var(--accent)' }}>
          404
        </p>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Page Not Found
        </h1>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
          The page you're looking for doesn't exist.
        </p>
        <Link to="/" className="btn btn-primary">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
