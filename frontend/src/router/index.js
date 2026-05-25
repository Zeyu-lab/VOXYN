import { createRouter, createWebHistory } from "vue-router";

import Home from "../pages/Home.vue";
import Login from "../pages/Login.vue";
import Dashboard from "../pages/Dashboard.vue";
import Profile from "../pages/Profile.vue"
import RoomView from "../pages/RoomView.vue"
const routes = [
  {
    path: "/",
    name: "Home",
    component: Home,
  },
  {
    path: "/login",
    name: "Login",
    component: Login,
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    component: Dashboard,
  },
  {
    path: "/room/:roomCode",
    component: RoomView
  },
  {
    path: "/profile",
    name: "Profile",
    component: Profile,
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;