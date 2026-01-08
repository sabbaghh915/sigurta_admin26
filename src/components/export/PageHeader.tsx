import ExportButtons from "./ExportButtons";

export default function PageHeader({
  title,
  entity,
  params,
  fileName,
}: {
  title: string;
  entity: string;
  params?: Record<string, any>;
  fileName?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-lg font-extrabold">{title}</h1>
      <ExportButtons entity={entity} fileName={fileName} params={params} />
    </div>
  );
}
