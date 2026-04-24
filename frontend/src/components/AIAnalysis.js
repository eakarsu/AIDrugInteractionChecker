import React from 'react';

const AIAnalysis = ({ content, loading }) => {
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div style={styles.aiIcon}>AI</div>
          <span style={styles.headerText}>AI Analysis</span>
          <div style={styles.loadingDots}>
            <span style={{ ...styles.dot, animationDelay: '0s' }}>●</span>
            <span style={{ ...styles.dot, animationDelay: '0.2s' }}>●</span>
            <span style={{ ...styles.dot, animationDelay: '0.4s' }}>●</span>
          </div>
        </div>
        <div style={styles.skeleton}>
          <div style={{ ...styles.skeletonLine, width: '80%' }} />
          <div style={{ ...styles.skeletonLine, width: '60%' }} />
          <div style={{ ...styles.skeletonLine, width: '90%' }} />
          <div style={{ ...styles.skeletonLine, width: '70%' }} />
        </div>
        <style>{pulseAnimation}</style>
      </div>
    );
  }

  if (!content) return null;

  const renderMarkdown = (text) => {
    const lines = text.split('\n');
    const elements = [];
    let inList = false;
    let listItems = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} style={styles.list}>
            {listItems.map((item, i) => (
              <li key={i} style={styles.listItem}>{renderInline(item)}</li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    const renderInline = (text) => {
      return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code style="background:#1e293b;padding:2px 6px;border-radius:4px;font-size:12px;color:#60a5fa">$1</code>');
    };

    lines.forEach((line, i) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={i} style={styles.h2}>
            <span style={styles.h2Accent} />
            <span dangerouslySetInnerHTML={{ __html: renderInline(trimmed.slice(3)) }} />
          </h2>
        );
      } else if (trimmed.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={i} style={styles.h3}>
            <span dangerouslySetInnerHTML={{ __html: renderInline(trimmed.slice(4)) }} />
          </h3>
        );
      } else if (trimmed.match(/^[-*] /)) {
        inList = true;
        listItems.push(trimmed.slice(2));
      } else if (trimmed.match(/^\d+\. /)) {
        flushList();
        inList = true;
        listItems.push(trimmed.replace(/^\d+\.\s*/, ''));
      } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        flushList();
        elements.push(
          <div key={i} style={styles.highlight}>
            <span dangerouslySetInnerHTML={{ __html: renderInline(trimmed) }} />
          </div>
        );
      } else if (trimmed.startsWith('*') && trimmed.endsWith('*') && !trimmed.startsWith('**')) {
        flushList();
        elements.push(
          <p key={i} style={styles.note}>
            <span dangerouslySetInnerHTML={{ __html: renderInline(trimmed) }} />
          </p>
        );
      } else if (trimmed === '') {
        flushList();
      } else {
        flushList();
        elements.push(
          <p key={i} style={styles.paragraph}>
            <span dangerouslySetInnerHTML={{ __html: renderInline(trimmed) }} />
          </p>
        );
      }
    });

    flushList();
    return elements;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.aiIcon}>AI</div>
        <span style={styles.headerText}>AI Analysis</span>
        <span style={styles.badge}>Powered by Claude</span>
      </div>
      <div style={styles.content}>
        {renderMarkdown(content)}
      </div>
    </div>
  );
};

const pulseAnimation = `
  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }
  @keyframes shimmer {
    0% { background-position: -200px 0; }
    100% { background-position: calc(200px + 100%) 0; }
  }
`;

const styles = {
  container: {
    background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.05), rgba(16, 185, 129, 0.03))',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '16px',
    overflow: 'hidden',
    marginTop: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '16px 20px',
    background: 'rgba(59, 130, 246, 0.08)',
    borderBottom: '1px solid rgba(59, 130, 246, 0.15)',
  },
  aiIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    fontWeight: '800',
    color: 'white',
    letterSpacing: '-0.5px',
  },
  headerText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#e2e8f0',
    flex: 1,
  },
  badge: {
    fontSize: '10px',
    padding: '4px 10px',
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    borderRadius: '20px',
    color: '#a78bfa',
    fontWeight: '500',
  },
  loadingDots: {
    display: 'flex',
    gap: '4px',
  },
  dot: {
    color: '#3b82f6',
    animation: 'pulse 1.4s ease-in-out infinite',
    fontSize: '10px',
  },
  skeleton: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  skeletonLine: {
    height: '14px',
    borderRadius: '7px',
    background: 'linear-gradient(90deg, #1e293b 0%, #334155 50%, #1e293b 100%)',
    backgroundSize: '200px 100%',
    animation: 'shimmer 1.5s ease-in-out infinite',
  },
  content: {
    padding: '20px',
  },
  h2: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#f1f5f9',
    marginTop: '20px',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  h2Accent: {
    width: '4px',
    height: '20px',
    borderRadius: '2px',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    flexShrink: 0,
  },
  h3: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#cbd5e1',
    marginTop: '16px',
    marginBottom: '8px',
  },
  paragraph: {
    fontSize: '14px',
    color: '#94a3b8',
    lineHeight: '1.7',
    marginBottom: '8px',
  },
  list: {
    listStyle: 'none',
    padding: '0 0 0 8px',
    marginBottom: '12px',
  },
  listItem: {
    fontSize: '14px',
    color: '#94a3b8',
    lineHeight: '1.7',
    paddingLeft: '20px',
    position: 'relative',
    marginBottom: '4px',
    borderLeft: '2px solid rgba(59, 130, 246, 0.2)',
    paddingTop: '2px',
    paddingBottom: '2px',
  },
  highlight: {
    background: 'rgba(59, 130, 246, 0.08)',
    borderRadius: '8px',
    padding: '10px 16px',
    marginBottom: '8px',
    fontSize: '14px',
    color: '#e2e8f0',
  },
  note: {
    fontSize: '13px',
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: '16px',
    padding: '12px 16px',
    background: 'rgba(100, 116, 139, 0.08)',
    borderRadius: '8px',
    borderLeft: '3px solid #475569',
  },
};

export default AIAnalysis;
