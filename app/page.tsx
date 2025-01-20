import Chat from "../components/Crisp";
import PdfViewer from "../components/PdfViewer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-grow flex flex-col md:flex-row bg-white">
        <aside className="w-full md:w-1/2 flex items-center justify-center p-4">
          <PdfViewer />
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
