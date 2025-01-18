import Image from "next/image";
import Chat from "../components/Crisp";
import PdfViewer from "../components/PdfViewer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* <header className="w-full flex justify-center py-8">
        <div className="relative w-24 h-10">
          <Image
            src="/salesforce-logo.png"
            alt="Salesforce Logo"
            layout="fill"
            objectFit="contain"
            priority
          />
        </div>
      </header> */}

      <div className="flex-grow flex flex-col md:flex-row bg-white">
        <aside className="w-full md:w-1/2 flex items-center justify-center p-4">
          <PdfViewer searchText={"This associates the class with the most recent version of Apex and the API, as well as each managed package."} />
        </aside>

        <main className="flex-grow flex items-center justify-center p-4">
          <Chat />
        </main>
      </div>

      <footer className="w-full py-4 text-center text-gray-500 text-sm">
        &copy; {new Date().getFullYear()} Salesforce
      </footer>
    </div>
  );
}
