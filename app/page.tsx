import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Bem-vindo ao PipeMirror</h1>
        <p className="text-gray-500 mt-1">
          Exporte a configuração de um CRM Pipedrive e replique para clientes em segundos.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/export">
          <div className="border rounded-xl p-6 bg-white hover:border-blue-500 hover:shadow-sm transition cursor-pointer">
            <div className="text-3xl mb-3">📤</div>
            <h2 className="font-semibold text-lg">Exportar Template</h2>
            <p className="text-gray-500 text-sm mt-1">
              Conecte a conta de origem e salve a estrutura como template reutilizável.
            </p>
          </div>
        </Link>

        <Link href="/templates">
          <div className="border rounded-xl p-6 bg-white hover:border-purple-500 hover:shadow-sm transition cursor-pointer">
            <div className="text-3xl mb-3">🗂️</div>
            <h2 className="font-semibold text-lg">Templates</h2>
            <p className="text-gray-500 text-sm mt-1">
              Visualize, pré-visualize e gerencie os templates salvos.
            </p>
          </div>
        </Link>

        <Link href="/clone">
          <div className="border rounded-xl p-6 bg-white hover:border-green-500 hover:shadow-sm transition cursor-pointer">
            <div className="text-3xl mb-3">📥</div>
            <h2 className="font-semibold text-lg">Clonar para Cliente</h2>
            <p className="text-gray-500 text-sm mt-1">
              Escolha um template salvo e replique para a conta do cliente.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
