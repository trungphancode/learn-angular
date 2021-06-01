import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-cd',
  templateUrl: './cd.component.html',
  styleUrls: ['./cd.component.scss']
})
export class CdComponent implements OnInit {

  title = 'Original title';

  constructor() { }

  ngOnInit(): void {
    setTimeout(() => {
      this.title = 'New title';
      console.log('New title set', this.title);
    }, 2000);
  }
}
