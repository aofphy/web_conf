import React, { useState, useCallback } from 'react';
import MDEditor from '@uiw/react-md-editor';
import { Box, Typography, Paper, Accordion, AccordionSummary, AccordionDetails, Chip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { marked } from 'marked';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: number;
  error?: boolean;
  helperText?: string;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = "Enter your abstract in markdown format...",
  height = 400,
  error = false,
  helperText
}) => {
  const [showHelp, setShowHelp] = useState(false);

  const handleChange = useCallback((val?: string) => {
    onChange(val || '');
  }, [onChange]);

  const markdownHelp = {
    headers: {
      title: "Headers",
      examples: [
        "# Main Title",
        "## Section Title", 
        "### Subsection Title"
      ]
    },
    emphasis: {
      title: "Text Emphasis",
      examples: [
        "**Bold text**",
        "*Italic text*",
        "***Bold and italic***",
        "`Inline code`"
      ]
    },
    lists: {
      title: "Lists",
      examples: [
        "- Bullet point 1",
        "- Bullet point 2",
        "",
        "1. Numbered item 1",
        "2. Numbered item 2"
      ]
    },
    links: {
      title: "Links and References",
      examples: [
        "[Link text](https://example.com)",
        "[Reference][1]",
        "",
        "[1]: https://example.com"
      ]
    },
    scientific: {
      title: "Scientific Notation",
      examples: [
        "H₂O (use Unicode subscripts)",
        "E = mc² (use Unicode superscripts)",
        "Temperature: 25°C",
        "Concentration: 10⁻⁶ M"
      ]
    },
    math: {
      title: "Mathematical Expressions",
      examples: [
        "Inline math: $E = mc^2$",
        "Block math:",
        "$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$"
      ]
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Abstract Content
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Write your abstract using Markdown formatting. Use the preview to see how it will appear.
        </Typography>
        
        <Accordion expanded={showHelp} onChange={() => setShowHelp(!showHelp)}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">
              Markdown Formatting Help
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2 }}>
              {Object.entries(markdownHelp).map(([key, section]) => (
                <Paper key={key} sx={{ p: 2 }} variant="outlined">
                  <Typography variant="subtitle2" gutterBottom>
                    {section.title}
                  </Typography>
                  <Box component="pre" sx={{ 
                    fontFamily: 'monospace', 
                    fontSize: '0.875rem',
                    whiteSpace: 'pre-wrap',
                    margin: 0,
                    color: 'text.secondary'
                  }}>
                    {section.examples.join('\n')}
                  </Box>
                </Paper>
              ))}
            </Box>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Academic Writing Tips
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip size="small" label="Use clear section headers" />
                <Chip size="small" label="Include methodology" />
                <Chip size="small" label="State key findings" />
                <Chip size="small" label="Mention implications" />
                <Chip size="small" label="Keep it concise" />
              </Box>
            </Box>
          </AccordionDetails>
        </Accordion>
      </Box>

      <Box sx={{ 
        border: error ? '2px solid' : '1px solid',
        borderColor: error ? 'error.main' : 'divider',
        borderRadius: 1,
        overflow: 'hidden'
      }}>
        <MDEditor
          value={value}
          onChange={handleChange}
          height={height}
          preview="edit"
          hideToolbar={false}
          visibleDragBar={false}
          textareaProps={{
            placeholder,
            style: {
              fontSize: 14,
              lineHeight: 1.6,
              fontFamily: 'inherit'
            }
          }}
          data-color-mode="light"
        />
      </Box>
      
      {helperText && (
        <Typography 
          variant="caption" 
          color={error ? 'error' : 'text.secondary'}
          sx={{ mt: 1, display: 'block' }}
        >
          {helperText}
        </Typography>
      )}
      
      {value && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Preview (as it will appear in the abstract book)
          </Typography>
          <Paper 
            sx={{ 
              p: 2, 
              backgroundColor: 'grey.50',
              '& h1, & h2, & h3, & h4, & h5, & h6': {
                marginTop: 2,
                marginBottom: 1
              },
              '& p': {
                marginBottom: 1
              },
              '& ul, & ol': {
                marginBottom: 1,
                paddingLeft: 2
              }
            }}
          >
            <div 
              dangerouslySetInnerHTML={{ 
                __html: marked(value, { 
                  breaks: true,
                  gfm: true 
                }) 
              }} 
            />
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default MarkdownEditor;