import {Component, OnInit} from '@angular/core';
import {AdminService} from '../../services/adminService/admin.service';
import {ToastrService} from 'ngx-toastr';
import {getUrl} from '../../constants/functions';
import { NgClass } from '@angular/common';
import {HeaderComponent} from '../header/header.component';
import {GoogleMap, MapMarker} from '@angular/google-maps';
import {ButtonLoaderComponent} from '../button-loader/button-loader.component';

@Component({
  selector: 'app-admin-yacht-management',
  imports: [
    NgClass,
    HeaderComponent,
    GoogleMap,
    MapMarker,
    ButtonLoaderComponent
],
  templateUrl: './admin-yacht-management.component.html',
  standalone: true,
  styleUrl: './admin-yacht-management.component.css'
})
export class AdminYachtManagementComponent implements OnInit {
  selectedTab: string = 'validated';
  pendingYachts: any[] = [];
  validatedYachts: any[] = [];
  isMapModalOpen: boolean = false;
  center = {lat: 0, lng: 0};
  zoom = 12;
  currentImage: string[] = [];
  loadingYachts: { [key: string]: boolean } = {};


  constructor(private adminService: AdminService, private toastr: ToastrService) {
  }

  ngOnInit() {
    this.loadYachts();
  }

  loadYachts() {
    this.adminService.getAllYachts().subscribe({
      next: (data) => {
        this.pendingYachts = data.filter(yacht => !yacht.isValidatedByAdmin);
        this.validatedYachts = data.filter(yacht => yacht.isValidatedByAdmin);
        this.startImageRotation(this.validatedYachts);
      },
      error: (err) => {
        console.error('❌ Erreur lors du chargement des yachts:', err);
      }
    });
  }

  startImageRotation(yachts: any[]): void {
    yachts.forEach((yacht, index) => {
      let currentIndex = 0;
      this.currentImage[index] = yacht.images[0];

      setInterval(() => {
        currentIndex = (currentIndex + 1) % yacht.images.length;
        this.currentImage[index] = yacht.images[currentIndex];
      }, 10000);

    });
  }

  prevImage(index: number, yacht: any): void {
    const images = yacht.images;
    const currentIndex = images.indexOf(this.currentImage[index]);
    this.currentImage[index] = images[(currentIndex - 1 + images.length) % images.length];
  }

  nextImage(index: number, yacht: any): void {
    const images = yacht.images;
    const currentIndex = images.indexOf(this.currentImage[index]);
    this.currentImage[index] = images[(currentIndex + 1) % images.length];
  }


  selectTab(tab: string) {
    this.selectedTab = tab;
    if (this.selectedTab == 'pending') {
      this.startImageRotation(this.pendingYachts);
    } else {
      this.startImageRotation(this.validatedYachts);

    }
  }

  approveYacht(yacht: any) {
    this.loadingYachts[yacht._id] = true;
    this.adminService.approveYacht(yacht._id).subscribe(() => {
      this.loadingYachts[yacht._id] = false;
      !yacht.isValidatedByAdmin ? this.toastr.success(' Yacht approuvé avec succès!') : this.toastr.success(' Yacht blockée avec succès!');
      this.loadYachts();
    });
  }
  openMapModal(yacht: any): void {
    const [lat, lng] = yacht.location.split(',').map(Number);
    this.center = { lat, lng };
    this.isMapModalOpen = true;
  }

  closeMapModal(): void {
    this.isMapModalOpen = false;
  }

  protected readonly getUrl = getUrl;
}


