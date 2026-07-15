import { InboxPage } from "@/components/dashboard/core-pages";

type DashboardPageProps = {
	searchParams?: Promise<{ filter?: string | string[] }>;
};

export default async function Page({ searchParams }: DashboardPageProps) {
	const params = await searchParams;
	const filter = Array.isArray(params?.filter)
		? params?.filter[0]
		: params?.filter;
	return <InboxPage filter={filter} />;
}
