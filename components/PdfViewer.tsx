"use client";

import "bootstrap/dist/css/bootstrap.min.css";
import { Document, Page, pdfjs } from "react-pdf";
import { useState, useEffect, useCallback, useRef } from "react";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import io from "socket.io-client";
import FancyLoading from "./FancyLoading";
import Fuse from "fuse.js";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const PdfViewer = () => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [highlightedText, setHighlightedText] = useState<string | null>(null);

  const [pdfData, setPdfData] = useState({
    fileUrl: "",
    chunk: "",
    fileContent: "",
    timestamp: Date.now(),
  });

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

  const normalizeText = (text: string): string =>
    text
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[‘’]/g, "'") 
      .replace(/[“”]/g, '"') 
      .trim();

  const searchAndHighlightTextHtml = useCallback(() => {
    if (pdfData.fileContent && pdfData.chunk) {
      const container = document.createElement("div");
      container.innerHTML = pdfData.fileContent;
  
      const normalizedChunk = normalizeText(pdfData.chunk);
      const extractTextWithIndices = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
          return normalizeText(node.nodeValue || "");
        } else if (node.nodeType === Node.ELEMENT_NODE && node.childNodes) {
          return Array.from(node.childNodes).map(extractTextWithIndices).join(" ");
        }
        return "";
      };
  
      const plainText = extractTextWithIndices(container);
  
      const fuse = new Fuse([plainText], {
        includeMatches: true,
        threshold: 0.9,
        minMatchCharLength: 5,
      });
  
      const results = fuse.search(normalizedChunk);
  
      if (results.length > 0) {
        const matches = results[0].matches || [];
        matches.forEach(({ indices }) => {
          indices.forEach(([start, end]) => {
            let currentOffset = 0;
  
            const highlightNodes = (node: Node) => {
              if (node.nodeType === Node.TEXT_NODE) {
                const text = node.nodeValue || "";
                const length = text.length;
  
                if (start >= currentOffset && end <= currentOffset + length) {
                  const range = document.createRange();
                  range.setStart(node, start - currentOffset);
                  range.setEnd(node, end - currentOffset);
  
                  const mark = document.createElement("hl");
                  mark.className = "bg-warning text-dark";
                  range.surroundContents(mark);
                }
                currentOffset += length;
              } else if (node.nodeType === Node.ELEMENT_NODE && node.childNodes) {
                node.childNodes.forEach(highlightNodes);
              }
            };
  
            highlightNodes(container);
          });
        });
      }
  
      return container.innerHTML;
    }
    return pdfData.fileContent;
  }, [pdfData.fileContent, pdfData.chunk]);
  
  const searchAndHighlightTextPdf = useCallback(async () => {
    const pdf = await pdfjs.getDocument(pdfData.fileUrl).promise;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const textItems = textContent.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => item.str)
        .join(" ");
      if (textItems.includes(pdfData.chunk)) {
        setPageNumber(i);
        setHighlightedText(pdfData.chunk);
        break;
      }
    }
  }, [pdfData.chunk, pdfData.fileUrl]);

  useEffect(() => {
    if (pdfData.chunk) {
      if (pdfData.fileContent) {
        searchAndHighlightTextHtml();
      } else if (pdfData.fileUrl) {
        searchAndHighlightTextPdf();
      }
    }
  }, [pdfData.chunk, pdfData.fileContent, pdfData.fileUrl, searchAndHighlightTextHtml, searchAndHighlightTextPdf]);

  useEffect(() => {
    setPageNumber((prevPageNumber) => prevPageNumber);
  }, [highlightedText]);

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

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handlePreviousClick = () => {
    setPageNumber((prevPageNumber) => Math.max(prevPageNumber - 1, 1));
  };

  const handleNextClick = () => {
    setPageNumber((prevPageNumber) =>
      numPages !== null ? Math.min(prevPageNumber + 1, numPages) : prevPageNumber + 1
    );
  };

  return pdfData.fileContent ? (
    <div className="flex flex-col items-start p-4 rounded-lg">
       <div
        className="overflow-auto border rounded p-3 bg-light shadow"
        style={{
          height: "800px",
          width: "140%",
        }}
      >
        <div dangerouslySetInnerHTML={{ __html: searchAndHighlightTextHtml() || "" }} />
      </div>
    </div>
  ) : pdfData.fileUrl ? (
    <div className="flex flex-col items-start p-4 bg-gray-100 rounded-lg shadow-md">
      <div className="pdf-container mb-4">
        <Document
          key={pdfData.fileUrl + pdfData.timestamp}
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
  ) : (
    <FancyLoading />
  );
};

export default PdfViewer;