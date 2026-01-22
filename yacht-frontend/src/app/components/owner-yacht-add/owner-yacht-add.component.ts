import {Component, OnInit} from '@angular/core';
import {Yacht} from '../../constants/Yacht';
import {HttpClient} from '@angular/common/http';
import {YachtService} from '../../services/yachtService/yacht.service';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {showAlert} from '../../constants/functions';
import {HeaderComponent} from "../header/header.component";
import {ButtonLoaderComponent} from '../button-loader/button-loader.component';
import {GoogleMap, MapMarker} from '@angular/google-maps';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-owner-yacht-add',
  imports: [
    FormsModule,
    HeaderComponent,
    GoogleMap,
    MapMarker,
    ButtonLoaderComponent,
    CommonModule
],
  templateUrl: './owner-yacht-add.component.html',
  standalone: true,
  styleUrl: './owner-yacht-add.component.css'
})
export class OwnerYachtAddComponent implements OnInit{
  yacht : Yacht ={
    name: '',
    description: '',
    pricePerDay: 0,
    capacity: 0,
    owner: '',
    location :'',
    isValidatedByAdmin : false,
    isPublic : false,
    image: [] as File[]
  };

  previewImages: string[] = [];
  yachtId: string | null = null;
  isEditMode = false;
  showMapModal = false;
  isMapModalOpen = false;
  isLoading = false;
  
  // Map settings - Tunis, Tunisia
  center = { lat: 36.8065, lng: 10.1815 };
  zoom = 12;
  selectedPosition = { ...this.center };
  
  markerOptions = { 
    draggable: true,
    animation: google.maps.Animation.DROP
  };
  
  mapOptions: google.maps.MapOptions = {
    mapTypeControl: true,
    streetViewControl: false,
    fullscreenControl: true,
    zoomControl: true,
    styles: [
      {
        featureType: 'water',
        elementType: 'geometry',
        stylers: [{ color: '#667EEA' }]
      },
      {
        featureType: 'landscape',
        elementType: 'geometry',
        stylers: [{ color: '#f5f5f5' }]
      }
    ]
  };

  constructor(
    private http: HttpClient, 
    private route: ActivatedRoute,
    private router: Router,
    private yachtService :YachtService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.yachtId = params.get('id');
      this.isEditMode = !!this.yachtId;

      if (this.isEditMode && this.yachtId) {
        this.loadYachtDetails(this.yachtId);
      }
    });
  }

  openMapModal() {
    this.isMapModalOpen = true;
    // Si location existe, parser et centrer la carte
    if (this.yacht.location) {
      const [lat, lng] = this.yacht.location.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        this.selectedPosition = { lat, lng };
        this.center = { lat, lng };
      }
    }
  }

  closeMapModal() {
    this.isMapModalOpen = false;
  }

  onMapClick(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      this.selectedPosition = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
    }
  }

  onMarkerDragEnd(event: google.maps.MapMouseEvent) {
    if (event.latLng) {
      this.selectedPosition = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
      };
    }
  }

  resetLocation() {
    this.selectedPosition = { lat: 36.8065, lng: 10.1815 };
    this.center = { ...this.selectedPosition };
    this.zoom = 12;
  }

  getCurrentLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.selectedPosition = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          this.center = { ...this.selectedPosition };
          this.zoom = 15;
          this.toastr.success('Position actuelle détectée!');
        },
        (error) => {
          this.toastr.error('Impossible d\'obtenir votre position');
          console.error('Geolocation error:', error);
        }
      );
    } else {
      this.toastr.error('La géolocalisation n\'est pas supportée');
    }
  }

  confirmLocation() {
    this.yacht.location = `${this.selectedPosition.lat},${this.selectedPosition.lng}`;
    this.closeMapModal();
    this.toastr.success('📍 Position confirmée!');
  }

  loadYachtDetails(id: string): void {
    this.yachtService.getYachtById(id).subscribe({
      next: (yacht) => {
        this.yacht = {
          name: yacht.name,
          description: yacht.description,
          pricePerDay: yacht.pricePerDay,
          capacity: yacht.capacity,
          image:[yacht.image] ,
          owner: yacht.owner,
          location :yacht.location,
          isValidatedByAdmin : yacht.isValidatedByAdmin,
          isPublic : yacht.isPublic
        }
      },
      error: (err) => {
        console.error('Erreur lors du chargement des détails du yacht', err);
        this.toastr.error('Erreur lors du chargement du yacht');
      },
    });
  }

  onFileSelected(event: any) {
    if (event.target.files) {
      for (let file of event.target.files) {
        if (file.type.startsWith('image/')) {
          this.yacht.image.push(file);
          const reader = new FileReader();
          reader.onload = (e: any) => {
            this.previewImages.push(e.target.result);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }

  removeImage(index: number) {
    this.yacht.image.splice(index, 1);
    this.previewImages.splice(index, 1);
  }

  onSubmit(form: any): void {
    if (form.valid) {
      this.isLoading = true;
      const formData = new FormData();
      formData.append('name', this.yacht.name);
      formData.append('description', this.yacht.description);
      formData.append('location', this.yacht.location);
      formData.append('pricePerDay', this.yacht.pricePerDay.toString());
      formData.append('capacity', this.yacht.capacity.toString());
      
      if (this.yacht.image && this.yacht.image.length > 0) {
        this.yacht.image.forEach((img: string, index: any) => {
          formData.append(`images`, img);
        });
      }

      if (this.isEditMode && this.yachtId) {
        this.yachtService.updateYacht(this.yachtId, formData).subscribe({
          next: () => {
            this.isLoading = false;
            this.toastr.success('✅ Yacht modifié avec succès !');
            this.router.navigate(['/dashboard/owner/list']);
          },
          error: (err) => {
            this.isLoading = false;
            this.toastr.error('❌ Erreur lors de la modification du yacht');
            console.error('Erreur lors de la modification du yacht', err);
          },
        });
      } else {
        this.yachtService.createYacht(formData).subscribe({
          next: () => {
            this.isLoading = false;
            this.toastr.success('✅ Yacht ajouté avec succès !');
            form.reset();
            this.router.navigate(['/dashboard/owner/list']);
          },
          error: (err) => {
            this.isLoading = false;
            this.toastr.error('❌ Erreur lors de l\'ajout du yacht');
            console.error('Erreur lors de l\'ajout du yacht', err);
          },
        });
      }
    }
  }
}
