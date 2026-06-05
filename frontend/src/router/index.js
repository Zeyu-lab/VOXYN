import { createRouter, createWebHistory } from "vue-router"

import Home from "../pages/Home.vue"
import Login from "../pages/Login.vue"
import Signup from "../pages/Signup.vue"
import UpdatePassword from "../pages/UpdatePassword.vue"
import Dashboard from "../pages/Dashboard.vue"
import Profile from "../pages/Profile.vue"
import RoomView from "../pages/RoomView.vue"
import Setting from "../pages/Setting.vue"

const routes = [
  {
    path: "/",
    name: "Home",
    component: Home
  },
  {
    path: "/login",
    name: "Login",
    component: Login
  },
  {
    path: "/signup",
    name: "Signup",
    component: Signup
  },
  {
    path: "/update-password",
    name: "UpdatePassword",
    component: UpdatePassword
  },
  {
    path: "/dashboard",
    name: "Dashboard",
    component: Dashboard
  },
  {
    path: "/room/:roomCode",
    name: "Room",
    component: RoomView
  },
  {
    path: "/profile",
    name: "Profile",
    component: Profile
  },
  {
    path: "/settings",
    name: "Settings",
    component: Setting
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router