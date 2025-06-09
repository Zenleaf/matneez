import * as React from 'react';

interface WikiLinkSuggestionsProps {
  items: string[];
  command: (title: string) => void;
}

const WikiLinkSuggestions: React.FC<WikiLinkSuggestionsProps> = ({ items, command }) => {
  return (
    <div className="wiki-link-suggestions">
      {items.length ? (
        items.map((item, index) => (
          <button
            key={index}
            className="wiki-link-item"
            onClick={() => command(item)}
          >
            {item}
          </button>
        ))
      ) : (
        <div className="wiki-link-item">
          <span>No matching notes. Press Enter to create.</span>
        </div>
      )}
    </div>
  );
};

export default WikiLinkSuggestions;
