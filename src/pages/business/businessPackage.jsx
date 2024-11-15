import { useRef, useState, useEffect } from "react";
import { faCheck, faTimes, faInfoCircle } from "@fortawesome/free-solid-svg-icons";
import { Link, useMatch, useResolvedPath } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { BusinessNavbar } from "../../components/Navbars";
import '../../styles/home.css';
const CreatePackage = () => {
    const userID = localStorage.getItem('userID');

    return(
        <BusinessNavbar />
    )
    
}

export default CreatePackage;