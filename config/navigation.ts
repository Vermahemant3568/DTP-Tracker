import { LayoutDashboard, FolderKanban, Users, UsersRound, Briefcase, Globe, Settings } from "lucide-react";

export const navigation = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
  },
  {
    title: "Vendor Jobs",
    href: "/jobs",
    icon: Briefcase,
  },
  {
    title: "Clients",
    href: "/clients",
    icon: Users,
  },
  {
    title: "Team & Vendors",
    href: "/team",
    icon: UsersRound,
  },
  {
    title: "Languages",
    href: "/languages",
    icon: Globe,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
  },
];