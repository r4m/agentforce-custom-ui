import Image from "next/image";
import { useState, useEffect } from 'react';
import { FaFileAlt } from "react-icons/fa";

const salesforceQuotes = [
    "Customer success starts here!",
    "Trailblazing the future of business.",
    "Innovation is in our DNA.",
    "Building relationships with trust.",
    "Empowering you to succeed.",
  ];

  <div className="relative w-24 h-10">
          <Image
            src="/salesforce-logo.png"
            alt="Salesforce Logo"
            layout="fill"
            objectFit="contain"
            priority
          />
        </div>

const FancyLoading = () => {
  const [currentQuote, setCurrentQuote] = useState(salesforceQuotes[0]);

  useEffect(() => {
    const quoteInterval = setInterval(() => {
      setCurrentQuote((prevQuote) => {
        const currentIndex = salesforceQuotes.indexOf(prevQuote);
        const nextIndex = (currentIndex + 1) % salesforceQuotes.length;
        return salesforceQuotes[nextIndex];
      });
    }, 10000);

    return () => clearInterval(quoteInterval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-start h-screen p-4">
      <div className="flex flex-col items-center mb-8 mt-8">
        <div className="relative w-24 h-10 animate-bounce">
          <Image
            src="/salesforce-logo.png"
            alt="Salesforce Logo"
            layout="fill"
            objectFit="contain"
            priority
          />
        </div>
        <p className="text-lg font-semibold text-gray-700 text-center mt-4">
          {currentQuote}
        </p>
      </div>

      <div className="flex flex-col items-center text-center mt-24">
        <FaFileAlt className="h-32 w-32 text-gray-500 fade-in-out" />
        <p className="text-lg font-semibold text-gray-800 mt-4">
          Retrieving and enhancing document insights...
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Using Retrieval-Augmented Generation (RAG), this tool connects to external knowledge sources to provide detailed and accurate document content.
        </p>
      </div>
    </div>
  );
};

export default FancyLoading;