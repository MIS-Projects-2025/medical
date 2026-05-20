import { usePage } from "@inertiajs/react";
import SidebarLink from "@/Components/sidebar/SidebarLink";
import { LayoutDashboard, Package, ClipboardList, ScrollText, Tags } from "lucide-react";

export default function NavLinks({ isSidebarOpen }) {
    const { emp_data } = usePage().props;
    const isStation39 = Number(emp_data?.emp_station_id) === 39;

    return (
        <nav
            className="flex flex-col flex-grow space-y-1 overflow-y-auto"
            style={{ scrollbarWidth: "none" }}
        >
            <SidebarLink
                href={route("dashboard")}
                label="Dashboard"
                icon={<LayoutDashboard className="w-5 h-5" />}
                isSidebarOpen={isSidebarOpen}
            />
            {isStation39 && (
                <SidebarLink
                    href={route("inventory.index")}
                    label="Inventory"
                    icon={<Package className="w-5 h-5" />}
                    isSidebarOpen={isSidebarOpen}
                />
            )}
            {isStation39 && (
                <SidebarLink
                    href={route("issuance.index")}
                    label="Issuance"
                    icon={<ClipboardList className="w-5 h-5" />}
                    isSidebarOpen={isSidebarOpen}
                />
            )}
            {isStation39 && (
                <SidebarLink
                    href={route("inventory.types.index")}
                    label="Item Types"
                    icon={<Tags className="w-5 h-5" />}
                    isSidebarOpen={isSidebarOpen}
                />
            )}
            <SidebarLink
                href={route("issuance.records")}
                label="Issuance Records"
                icon={<ScrollText className="w-5 h-5" />}
                isSidebarOpen={isSidebarOpen}
            />
        </nav>
    );
}
