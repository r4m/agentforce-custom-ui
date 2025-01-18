"use client"

import { Document, Page, pdfjs } from 'react-pdf';
import { useState, useEffect, useCallback, useRef } from 'react';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const PdfViewer = ({ searchText }: { searchText: string }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [highlightedText, setHighlightedText] = useState<string | null>(null);

  useEffect(() => {
    if (searchText) {
      searchAndHighlightText(searchText);
    }
  }, [searchText]);

  useEffect(() => {
    setPageNumber((prevPageNumber) => prevPageNumber);
  }, [highlightedText]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  async function searchAndHighlightText(text: string) {
    const pdf = await pdfjs.getDocument('/salesforce_knowledge_implementation_guide.pdf').promise;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const textItems = textContent.items.map((item: any) => item.str).join(' ');
      if (textItems.includes(text)) {
        setPageNumber(i);
        setHighlightedText(text);
        break;
      }
    }
  }

  const remainingHighlight = useRef(highlightedText?.split(/\s+/));

  useEffect(() => {
    remainingHighlight.current = highlightedText?.split(/\s+/);
  }, [highlightedText]);

  const textRenderer = useCallback(
    (textItem: any) => {
      if (highlightedText) {
        const words = textItem.str.split(/\s+/);
        const processedWords = words.map(word => {
          if (remainingHighlight.current.length > 0 && word === remainingHighlight.current[0]) {
            remainingHighlight.current.shift();
            return `<mark style='background-color: yellow;'>${word}</mark>`;
          }
          return word;
        });
        return processedWords.join(" ");
      }

      return textItem.str;
    },
    [highlightedText]
  );      

  function handlePreviousClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setPageNumber((prevPageNumber) => Math.max(prevPageNumber - 1, 1));
  }

  function handleNextClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    setPageNumber((prevPageNumber) => (numPages !== null ? Math.min(prevPageNumber + 1, numPages) : prevPageNumber + 1));
  }

  return (
    <div className="flex flex-col items-start p-4 bg-gray-100 rounded-lg shadow-md">
      <div className="pdf-container mb-4">
        <Document
          file="/salesforce_knowledge_implementation_guide.pdf"
          onLoadSuccess={onDocumentLoadSuccess}
        >
          <Page pageNumber={pageNumber} customTextRenderer={textRenderer} />
        </Document>
      </div>
      <div className="flex justify-between w-full">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 disabled:bg-gray-300"
          disabled={pageNumber <= 1}
          onClick={handlePreviousClick}
        >
          Previous
        </button>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 disabled:bg-gray-300"
          disabled={numPages !== null && pageNumber >= numPages}
          onClick={handleNextClick}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PdfViewer;