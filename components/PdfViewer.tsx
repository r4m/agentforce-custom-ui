"use client";

import { Document, Page, pdfjs } from 'react-pdf';
import { useState, useEffect, useCallback, useRef } from 'react';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import io from "socket.io-client";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const PdfViewer = () => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [highlightedText, setHighlightedText] = useState<string | null>(null);

  const [pdfData, setPdfData] = useState({ fileUrl: "", chunk: "", timestamp: Date.now() });

  useEffect(() => {
    const socket = io(
      process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_DOMAIN_PRODUCTION
        : process.env.NEXT_PUBLIC_DOMAIN_LOCAL,
      { transports: ["websocket", "polling"] }
    );

    socket.on("pdf-update", (data) => {
      console.log("PDF update received:", data);
      setPdfData({ ...data, timestamp: Date.now() });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    setPageNumber((prevPageNumber) => prevPageNumber);
  }, [highlightedText]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
  }

  const searchAndHighlightText = useCallback(async (text: string) => {
    const pdf = await pdfjs.getDocument(pdfData.fileUrl).promise;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const textItems = textContent.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => item.str).join(' ');
      if (textItems.includes(text)) {
        setPageNumber(i);
        setHighlightedText(text);
        break;
      }
    }
  }, [pdfData.fileUrl]);

  useEffect(() => {
    if (pdfData.chunk) {
      searchAndHighlightText(pdfData.chunk);
    }
  }, [pdfData.chunk, searchAndHighlightText, pdfData.timestamp]);

  const remainingHighlight = useRef<string[] | undefined>(highlightedText?.split(/\s+/));

  useEffect(() => {
    remainingHighlight.current = highlightedText?.split(/\s+/);
  }, [highlightedText, pdfData.timestamp]);

  const textRenderer = useCallback(
    (textItem: { str: string; }) => {
      if (highlightedText) {
        const words = textItem.str.split(/\s+/);
        const processedWords = words.map((word) => {
          if (remainingHighlight.current && remainingHighlight.current.length > 0 && word === remainingHighlight.current[0]) {
            remainingHighlight.current.shift();
            return `<mark style='background-color: yellow;'>${word}</mark>`;
          }
          return word;
        });
        return processedWords.join(' ');
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
    setPageNumber((prevPageNumber) =>
      numPages !== null ? Math.min(prevPageNumber + 1, numPages) : prevPageNumber + 1
    );
  }
  
  return (
    !pdfData.fileUrl ? <div>Loading...</div> :
    <div className="flex flex-col items-start p-4 bg-gray-100 rounded-lg shadow-md">
      <div className="pdf-container mb-4">
        <Document
          key={pdfData.fileUrl+pdfData.timestamp}
          file={pdfData.fileUrl}
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